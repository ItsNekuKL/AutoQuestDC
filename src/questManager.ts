import { ClientQuest } from './client';
import type { AllQuestsResponse, QuestTaskConfigType } from './interface';
import { Quest } from './quest';
import { GatewayOpcodes } from 'discord-api-types/v10';

export class QuestManager implements Iterable<Quest> {
	private readonly quests = new Map<string, Quest>();
	public readonly client: ClientQuest;
	constructor(client: ClientQuest, quests: Quest[] = []) {
		this.client = client;
		quests.forEach((quest) => this.quests.set(quest.id, quest));
	}

	static fromResponse(
		client: ClientQuest,
		response: AllQuestsResponse,
	): QuestManager {
		return new QuestManager(
			client,
			response.quests.map((quest) => Quest.create(quest)),
		);
	}

	[Symbol.iterator](): IterableIterator<Quest> {
		return this.quests.values();
	}

	get size(): number {
		return this.quests.size;
	}

	list(): Quest[] {
		return Array.from(this.quests.values());
	}

	get(id: string): Quest | undefined {
		return this.quests.get(id);
	}

	upsert(quest: Quest): void {
		this.quests.set(quest.id, quest);
	}

	remove(id: string): boolean {
		return this.quests.delete(id);
	}

	clear(): void {
		this.quests.clear();
	}

	getExpired(date: Date = new Date()): Quest[] {
		return this.list().filter((quest) => quest.isExpired(date));
	}

	getCompleted(): Quest[] {
		return this.list().filter((quest) => quest.isCompleted());
	}

	getClaimable(): Quest[] {
		return this.list().filter(
			(quest) => quest.isCompleted() && !quest.hasClaimedRewards(),
		);
	}

	hasQuest(id: string): boolean {
		return this.quests.has(id);
	}

	filterQuestsValid() {
		return this.list().filter(
			(quest) =>
				quest.id !== '1412491570820812933' &&
				!quest.isCompleted() &&
				!quest.isExpired(),
		);
	}

	getApplicationData(ids: string[]) {
		const query = new URLSearchParams();
		ids.forEach((id) => query.append('application_ids', id));
		return this.client.rest.get(`/applications/public`, {
			query,
		}) as Promise<
			{
				// Partial<ApplicationData>
				id: string;
				name: string;
				icon: string;
				description: string;
				executables: {
					os: string;
					name: string;
					is_launcher: boolean;
				}[];
			}[]
		>;
	}

	acceptQuest(questId: string) {
		return this.client.rest
			.post(`/quests/${questId}/enroll`, {
				body: {
					location: 11, // QUEST_HOME_DESKTOP | https://docs.discord.food/resources/quests#quest-content-type
					is_targeted: false,
					metadata_raw: null,
				},
			})
			.then((r) => {
				const quest = this.get(questId);
				quest?.updateUserStatus(r as any);
				return quest;
			});
	}

	private async timeout(ms: number) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * Sends a Gateway PRESENCE_UPDATE (op 3) to fake playing a game.
	 * This is required for PLAY_ON_DESKTOP heartbeats to be counted by Discord.
	 */
	private async setFakePresence(applicationId: string, applicationName: string) {
		try {
			await this.client.websocketManager.send(0, {
				op: GatewayOpcodes.PresenceUpdate,
				d: {
					since: Date.now(),
					activities: [
						{
							name: applicationName,
							type: 0, // ActivityType.Playing
							application_id: applicationId,
							flags: 0,
						} as any,
					],
					status: 'online',
					afk: false,
				},
			} as any);
			console.log(`[Presence] Now faking: Playing "${applicationName}" (${applicationId})`);
		} catch (err: any) {
			console.log(`[Presence] Failed to set presence: ${err?.message}`);
		}
	}

	/**
	 * Clears the fake presence after a quest is done.
	 */
	private async clearPresence() {
		try {
			await this.client.websocketManager.send(0, {
				op: GatewayOpcodes.PresenceUpdate,
				d: {
					since: null,
					activities: [],
					status: 'online',
					afk: false,
				},
			} as any);
			console.log(`[Presence] Cleared.`);
		} catch {}
	}

	async doingQuest(quest: Quest) {
		const questName = quest.config.messages.quest_name;
		if (!quest.isEnrolledQuest()) {
			console.log(`Enrolling in quest "${questName}"...`);
			await this.acceptQuest(quest.id);
			// Small delay after enroll so Discord registers the enrolled_at timestamp
			await this.timeout(2000);
		}

		const applicationId = quest.config.application.id;
		const applicationName = quest.config.application.name;
		const taskConfig = quest.taskConfig;  // resolves task_config_v2 ?? task_config

		// Guard: skip if no task config
		if (!taskConfig?.tasks) {
			console.log(`Quest "${questName}" has no task config, skipping.`);
			return;
		}

		const KNOWN_TASK_TYPES = [
			'WATCH_VIDEO',
			'PLAY_ON_DESKTOP',
			'STREAM_ON_DESKTOP',
			'PLAY_ACTIVITY',
			'WATCH_VIDEO_ON_MOBILE',
		] as const;

		const taskName = KNOWN_TASK_TYPES.find(
			(x) => taskConfig.tasks[x as QuestTaskConfigType] != null,
		) as QuestTaskConfigType | undefined;

		if (!taskName) {
			console.log(`Quest "${questName}" has unknown task type, skipping.`);
			return;
		}

		const taskDef = taskConfig.tasks[taskName];
		if (!taskDef?.target) {
			console.log(`Quest "${questName}" task has no target, skipping.`);
			return;
		}

		const secondsNeeded = taskDef.target;
		let secondsDone = quest.userStatus?.progress?.[taskName]?.value ?? 0;

		// ─── WATCH_VIDEO / WATCH_VIDEO_ON_MOBILE ────────────────────────────────
		if (taskName === 'WATCH_VIDEO' || taskName === 'WATCH_VIDEO_ON_MOBILE') {
			const maxFuture = 10, speed = 7, interval = 1;
			// Use enrolled_at from userStatus; fall back to now (just enrolled)
			const enrolledAt = new Date(
				quest.userStatus?.enrolled_at ?? new Date().toISOString(),
			).getTime();
			let completed = false;

			console.log(`[Video] Starting "${questName}" — need ${secondsNeeded}s`);

			while (true) {
				const maxAllowed =
					Math.floor((Date.now() - enrolledAt) / 1000) + maxFuture;
				const diff = maxAllowed - secondsDone;
				const timestamp = secondsDone + speed;

				if (diff >= speed) {
					const res = (await this.client.rest.post(
						`/quests/${quest.id}/video-progress`,
						{
							body: {
								timestamp: Math.min(secondsNeeded, timestamp + Math.random()),
							},
						},
					)) as any;
					completed = res?.completed_at != null;
					secondsDone = Math.min(secondsNeeded, timestamp);
					console.log(`[Video] "${questName}" progress: ${secondsDone}/${secondsNeeded}s`);
				}

				if (timestamp >= secondsNeeded) break;
				await this.timeout(interval * 1000);
			}

			if (!completed) {
				const res = (await this.client.rest.post(
					`/quests/${quest.id}/video-progress`,
					{ body: { timestamp: secondsNeeded } },
				)) as any;
				completed = res?.completed_at != null;
			}

			console.log(`[Video] Quest "${questName}" ${completed ? 'COMPLETED ✔' : 'sent final tick — check Discord'}`);

		// ─── PLAY_ON_DESKTOP ─────────────────────────────────────────────────────
		} else if (taskName === 'PLAY_ON_DESKTOP') {
			// Step 1: Fake the game activity in Gateway so Discord sees us "Playing X"
			await this.setFakePresence(applicationId, applicationName);

			// Step 2: Send heartbeats every 60 s until Discord marks quest complete
			const intervalSec = 60;
			const maxAttempts = Math.ceil(secondsNeeded / intervalSec) + 10;
			let attempts = 0;

			console.log(`[Play] Starting "${questName}" — need ${secondsNeeded}s (~${Math.ceil(secondsNeeded / 60)} min)`);

			while (!quest.isCompleted() && attempts < maxAttempts) {
				attempts++;
				try {
					const res = (await this.client.rest.post(
						`/quests/${quest.id}/heartbeat`,
						{
							body: {
								application_id: applicationId,
								terminal: false,
							},
						},
					)) as any;

					// Heartbeat endpoint returns user_status at root or nested
					const newStatus = res?.user_status ?? (res?.enrolled_at ? res : null);
					if (newStatus) quest.updateUserStatus(newStatus);

					const progress = quest.userStatus?.progress?.[taskName]?.value ?? secondsDone;
					const remaining = Math.max(0, secondsNeeded - progress);
					console.log(
						`[Play] "${questName}" heartbeat ${attempts}: ${progress}/${secondsNeeded}s — ` +
						`${Math.ceil(remaining / 60)} min left`,
					);
				} catch (err: any) {
					console.log(`[Play] "${questName}" heartbeat ${attempts} error: ${err?.message}`);
				}

				if (!quest.isCompleted()) {
					await this.timeout(intervalSec * 1000);
				}
			}

			// Step 3: Send terminal heartbeat to finalise
			try {
				const res = (await this.client.rest.post(
					`/quests/${quest.id}/heartbeat`,
					{ body: { application_id: applicationId, terminal: true } },
				)) as any;
				const newStatus = res?.user_status ?? (res?.enrolled_at ? res : null);
				if (newStatus) quest.updateUserStatus(newStatus);
			} catch {}

			// Step 4: Clear the fake presence
			await this.clearPresence();

			if (quest.isCompleted()) {
				console.log(`[Play] Quest "${questName}" COMPLETED ✔`);
			} else {
				console.log(`[Play] Quest "${questName}" — max attempts reached. Check Discord.`);
			}

		// ─── STREAM_ON_DESKTOP ───────────────────────────────────────────────────
		} else if (taskName === 'STREAM_ON_DESKTOP') {
			console.log(
				`[Skip] STREAM_ON_DESKTOP not supported in Node.js. Use desktop app for: "${questName}"`,
			);

		// ─── PLAY_ACTIVITY ───────────────────────────────────────────────────────
		} else if (taskName === 'PLAY_ACTIVITY') {
			console.log(
				`[Skip] PLAY_ACTIVITY not supported in Node.js. Use desktop app for: "${questName}"`,
			);

		} else {
			console.log(`[Skip] Unknown task type for quest "${questName}".`);
		}
	}


}
