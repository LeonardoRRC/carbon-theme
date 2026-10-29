# Carbon Theme

A free dark theme for Pterodactyl 2.0 by The Quantum Development, with an editor in the administration area. Open **Admin → Carbon Theme** to change it; every change previews live and applies to all users when saved.

## Palette

- Two built-in palettes: **Carbon** (near-black with a cobalt accent) and **Gray Carbon** (graphite with a silver accent).
- Edit any of the Panel's 23 color tokens and the corner radius, or start from a preset and customize it.
- **Panel default** keeps the Panel's own colors while the other features still apply.

## Layout

- **Navigation:** top tabs, or a sidebar for server and account pages on screens 1024px and wider. Uses the Panel's built-in side navigation.
- **Content width:** standard (1200px), wide (1440px), or full width. Phones and tablets keep the Panel's own layout.
- **Sidebar width** for the administration sidebar and the server and account sidebar.
- **Dashboard servers:** the Panel's rows, or a new server card shown as **rows** or a **grid of cards**, with a status badge, the address, and CPU, memory, and disk usage bars.
- **Notifications:** the Panel's style, or Carbon notifications with a colored edge and a tinted icon.
- **Server console:** the Panel's console; the Carbon console: a header card with the live server status and uptime, colored power buttons, usage tiles in a row, a framed terminal in your palette's colors, and matching charts; or **Blocks**: titled blocks for the status, address, server ID, CPU, RAM, and storage in a row, a full-width terminal, and charts under the same accent band.
- **File manager:** the Panel's file list, or the Carbon file manager: a folder header with the number of folders, files, and their size, the Panel's toolbar and list in a framed window, and file icons colored by type (folders, archives, `.jar`, configuration, code, images, logs).
- **Sign-in pages:** the Panel's own, **Centered** (your logo, a greeting by the time of day, and the form in a card over a soft gradient), or **Split** (the same with a brand panel showing your logo and name beside the form; narrow screens use the centered layout). It covers login, two-step verification, and password reset.

## Server sidebar groups

- Organize the server sidebar into titled groups, such as *Manage* and *Configuration*, and order sections within them.
- A group's title is hidden for users who can see none of its sections. The administrator's **Open Admin Area** link always comes last, with its label.

## Typography

- Choose fonts for body text and headings: the Panel's font, any **Google Fonts** family (Inter, Poppins, Montserrat, and more), a font installed on visitors' devices, or your own **uploaded font files** (WOFF2, WOFF, TTF, OTF).

## Branding

- Upload your **logo** for the header and the login page, and choose to show it with or without the Panel name.
- Upload a **favicon** for browser tabs.

## Navigation icons

- Choose an icon for every navigation item: the header, server and account tabs, the administration sidebar, and pages added by other extensions.
- Over 50,000 icons from the 30 single-color sets in [react-icons](https://react-icons.github.io/react-icons/), including Font Awesome 5 and 6, Material Design, Bootstrap, Remix, Heroicons, Ionicons, Tabler, Phosphor, Lucide, Simple Icons (brand logos), and Game Icons. Search one set or all of them at once.
- Optionally add icons to the server and account tabs, which the Panel shows as text only.

## Installing

Carbon 2.0 needs **Pterodactyl 2.0.0-beta.1 or newer**, which introduced the theme system it is built on. For older 2.0 development builds, use Carbon 1.3.0.

Download `carbon-theme-2.0.0.pteroext` from the [latest release](https://github.com/LeonardoRRC/carbon-theme/releases/latest), then upload it in **Admin → Extensions**, or install it from the Panel root:

```bash
php artisan p:extension:install carbon-theme-2.0.0.pteroext --enable
```

Carbon is a Panel theme: on the first page load after it is enabled it becomes the active theme. Switch themes at any time in **Admin → Themes**; Carbon then leaves your choice alone. To disable or remove Carbon, first activate another theme there (the Panel does not disable the active theme). Your settings and uploaded files are kept.

Upgrading from 1.x keeps your saved settings: install the new package over the old one.

## How it works

Carbon is a theme on the Panel's theme API (`"type": "theme"`). Its base stylesheet is the theme stylesheet the Panel links in the page head. The stylesheet built from the editor's settings (palette, fonts, layout, icons, sidebar groups, branding) is served by the extension at `/extensions/carbon-theme/theme.css`, and uploaded files at `/extensions/carbon-theme/files/…`; they are kept in `storage/app/carbon-theme`.

The palette and corner radius are also copied into the theme settings under **Admin → Themes → Carbon Theme → Carbon (managed)**. The Panel writes those into the page head before anything loads, so the page has your colors from the first frame. Edit them in the Carbon editor, which keeps them in step.

Colors, fonts, and widths use the Panel's design tokens. Icons are drawn as CSS masks in the link's text color, so they follow the palette and hover states. The dashboard card, the file manager, and the Blocks console are view layers over the Panel's classic views: the Panel keeps its own data, actions, and permissions, and every slot other extensions use stays in place. A design set to "Panel" renders the classic view unchanged. The Carbon console restyles the Panel's console page and adds the live status through the console's power slot. The sign-in designs restyle the Panel's own forms and add their heading through the sign-in pages' slots.

The Panel shows its pages before the theme has tagged them. To keep its default layout from flashing, Carbon hides the page until it is ready (usually under a second) and shows it anyway after 2.5 seconds if it fails to load.

## Development

From a Pterodactyl 2.0 source checkout, with this folder at `extensions/carbon-theme`:

```bash
cd extensions/carbon-theme
npm install
npm run typecheck && npm test && npm run build
cd ../..
php artisan p:extension:doctor extensions/carbon-theme
php artisan p:extension:pack extensions/carbon-theme
```

To rebuild the icon packs in `resources/icons`:

```bash
npm i --no-save react-icons react react-dom
node scripts/build-icons.mjs
```

Flat Color Icons is left out because its icons are multicolored and the theme draws icons in a single color.

Icon licenses are in `resources/icons/LICENSES.md`.
