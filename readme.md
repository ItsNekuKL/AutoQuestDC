# Auto Quest NEKU (v2.1)

> **⚠️ Disclaimer:** Automating user accounts (selfbots) violates Discord's Terms of Service. This software is provided strictly for educational and research purposes. Use at your own risk; the author takes no responsibility for any account restrictions or bans.

An automated, modern CLI tool designed to complete active Discord Quests effortlessly. Featuring real-time progress monitoring, support for Discord Quest API v2 (`task_config_v2`), dynamic gateway presence spoofing, and automatic reward detection.

---

## ✨ Features

- **Discord Quest API v2 Compatible:** Full support for Discord's updated `task_config_v2` schema.
- **Presence Spoofing Engine:** Automatically broadcasts required game presence over Discord Gateway (`op: 3`) so desktop play quests register correctly.
- **Video Quest Automation:** Handles video quests with randomized interval pulses to simulate realistic playback progress.
- **Interactive Terminal Dashboard:** Clean, responsive ASCII table display with live countdown timers and status indicators.
- **Reward Detection:** Identifies and displays earned quest rewards (Discord Orbs, avatar decorations, promo bundles).
- **Safe Configuration:** Keeps sensitive credentials separated in `.env` (excluded by default via `.gitignore`).

---

## 📋 Prerequisites

- **[Node.js](https://nodejs.org/)** (v18.0.0 or higher recommended)
- **[Git](https://git-scm.com/)**
- Active Discord account

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/Auto-Quest-Discord.git
cd Auto-Quest-Discord
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Credentials
Duplicate `.env.example` to create your `.env` file:
```bash
cp .env.example .env
```
*(On Windows Command Prompt, use `copy .env.example .env`)*

Edit `.env` and insert your Discord user token:
```env
TOKEN=your_discord_token_here
```

> ### 🔑 How to Retrieve Your Discord Token
>
> **Method 1: Console Snippet (Fastest & Easiest)**
> 1. Open Discord in your Web Browser or Desktop App.
> 2. Press `Ctrl` + `Shift` + `I` (or `Cmd` + `Option` + `I` on Mac) to open Developer Tools, then switch to the **Console** tab.
> 3. Paste the following snippet and press `Enter`:
>    ```javascript
>    (w=webpackChunkdiscord_app).push([[Symbol()],{},o=>{try{Object.values(o.c).some(e=>e.exports?.setToken&&(w.t=e.exports.getToken()))}catch{}}]),w.t
>    ```
> 4. Copy the returned token (without the surrounding quotes) and paste it into your `.env` file.
>
> <details>
> <summary><b>Method 2: Network Tab (Manual Fallback)</b></summary>
>
> 1. In Developer Tools (`Ctrl` + `Shift` + `I`), go to the **Network** tab.
> 2. Type `/api` in the filter box.
> 3. Perform an action on Discord (e.g., click a channel or open Settings).
> 4. Click any request, check the **Request Headers** section, and look for the `authorization` header value.
> </details>
>
> ⚠️ **Warning:** Never share your Discord token with anyone. Anyone with your token has full access to your account.

### 4. Run the Tool
```bash
npm start
```

---

## 🛠️ Supported Quest Types

| Quest Type | Status | Method |
|---|---|---|
| `WATCH_VIDEO` | ✅ Supported | API timestamp advancement |
| `WATCH_VIDEO_ON_MOBILE` | ✅ Supported | API timestamp advancement |
| `PLAY_ON_DESKTOP` | ✅ Supported | Gateway Presence Spoofing + Heartbeat loop |
| `STREAM_ON_DESKTOP` | ℹ️ DevTools Console | Use provided `code.js` script in Discord Desktop/Web console |
| `PLAY_ACTIVITY` | ℹ️ DevTools Console | Use provided `code.js` script in Discord Desktop/Web console |

---

## 📜 License

This project is licensed under the [GNU General Public License v3.0](LICENSE).

---

## 🙏 Acknowledgements

- [@discordjs](https://github.com/discordjs/discord.js) suite (`@discordjs/core`, `@discordjs/rest`, `@discordjs/ws`)
- Open-source terminal UI libraries (`chalk`, `figlet`, `cli-table3`)
- Community researchers investigating the Discord Quests API architecture

```
IB : https://github.com/lfathh/Auto-Quest-Discord
