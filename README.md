# mcp-capcut

MCP (Model Context Protocol) server untuk mengedit video di **CapCut desktop (Mac)** — AI menyusun timeline (klip, audio, teks), lalu hasilnya dibuka di CapCut untuk preview dan export.

## Cara kerja

CapCut desktop menyimpan project sebagai folder "draft" berisi `draft_content.json` (timeline: tracks, segments, materials — semua waktu dalam mikrodetik). Server ini men-generate file tersebut langsung, tanpa API perantara, lalu menaruhnya di folder drafts CapCut:

```
~/Movies/CapCut/User Data/Projects/com.lveditor.draft/<nama-project>/
```

Override lokasi dengan env `CAPCUT_DRAFTS_DIR` (dipakai juga untuk testing).

## Prasyarat

- macOS dengan [CapCut desktop](https://www.capcut.com) (versi gratis cukup) — jalankan minimal sekali agar folder drafts-nya dibuat
- Node.js ≥ 18
- [pnpm](https://pnpm.io) (`corepack enable` atau `npm i -g pnpm`)
- `ffmpeg` (opsional tapi disarankan) — `ffprobe`-nya dipakai membaca durasi/resolusi media otomatis:
  ```bash
  brew install ffmpeg
  ```
  Tanpa ffprobe, isi parameter `duration` manual di `add_video`/`add_audio`.

## Instalasi

Tidak perlu clone atau build — `npx` menjalankan server langsung dari repo GitHub ini (di-clone + di-compile otomatis saat pertama kali, lalu di-cache):

```json
{
  "mcpServers": {
    "capcut": {
      "command": "npx",
      "args": ["-y", "github:dimsdeall/mcp-capcut"]
    }
  }
}
```

Untuk mengunci ke versi tertentu, pakai tag rilis: `github:dimsdeall/mcp-capcut#v0.2.0`.

### Claude Code (per project)

Simpan config di atas sebagai `.mcp.json` di root project tempat kamu bekerja.

### Claude Code (semua project)

```bash
claude mcp add --scope user capcut -- npx -y github:dimsdeall/mcp-capcut
```

### Claude Desktop

Tambahkan config di atas ke `~/Library/Application Support/Claude/claude_desktop_config.json`, lalu restart aplikasinya (Cmd+Q).

> **Catatan nvm:** Claude Desktop tidak membaca PATH shell. Kalau Node terpasang lewat nvm, isi `command` dengan path absolut npx (`which npx`), misalnya `/Users/kamu/.nvm/versions/node/v20.19.4/bin/npx`.

### Gemini CLI

Config yang sama masuk ke `~/.gemini/settings.json` (key-nya juga `mcpServers`).

Setelah terdaftar, coba minta AI:

> buat draft CapCut bernama "tes-pertama" ukuran 1080x1920, tambahkan teks "Halo!" selama 3 detik, lalu save

Lalu buka CapCut — project-nya muncul di daftar draft.

## Tools

| Tool | Fungsi |
|---|---|
| `create_draft` | Buat project baru (nama, resolusi, fps) |
| `add_video` | Tambah klip video/gambar (trim, posisi timeline, speed, volume, scale/posisi) |
| `add_audio` | Tambah musik/voice-over |
| `add_text` | Tambah teks/subtitle (warna, ukuran, posisi) |
| `describe_draft` | Lihat isi timeline |
| `save_draft` | Tulis draft ke folder CapCut |
| `list_drafts` | Daftar draft di sesi dan di disk |

Semua waktu di API tools dalam **detik**; konversi ke mikrodetik (format internal CapCut) ditangani server.

## Development

```bash
git clone https://github.com/dimsdeall/mcp-capcut.git
cd mcp-capcut
pnpm install
pnpm dev      # tsc --watch
pnpm build    # compile ke dist/
```

Draft disusun di memori; `save_draft` yang menulisnya ke disk. Untuk testing tanpa menyentuh folder CapCut asli:

```bash
CAPCUT_DRAFTS_DIR=/tmp/capcut-test node dist/index.js
```

Setelah mengubah kode, jalankan `pnpm build` lalu restart klien Claude agar server dimuat ulang.

## Versioning & release

Project ini memakai [changesets](https://github.com/changesets/changesets):

1. Setiap PR yang mengubah perilaku wajib menyertakan file changeset — jalankan `pnpm changeset`, pilih tipe bump (patch/minor/major), tulis ringkasannya. CI menolak PR tanpa changeset (`pnpm changeset --empty` untuk perubahan yang tidak perlu naik versi).
2. Saat PR masuk ke `main`, workflow Release membuka/meng-update PR **"chore: release"** berisi kenaikan versi + `CHANGELOG.md`.
3. Merge PR release itu → versi resmi naik, git tag dan GitHub Release dibuat otomatis.

Syarat sekali-setup di repo: **Settings → Actions → General → Workflow permissions** harus *Read and write* dengan **"Allow GitHub Actions to create and approve pull requests"** dicentang.

## Catatan

- Tutup/restart CapCut setelah `save_draft` supaya project baru muncul di daftar.
- Format draft ini dipakai CapCut versi-versi saat ini; jika suatu saat CapCut mengenkripsi draft-nya (seperti JianYing versi Cina terbaru), pendekatan tulis-file ini perlu disesuaikan.
- Referensi format: [pyJianYingDraft](https://github.com/GuanYixuan/pyJianYingDraft) dan [VectCutAPI](https://github.com/sun-guannan/VectCutAPI).
