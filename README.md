# capcut-mcp

MCP server buatan sendiri untuk mengedit video di CapCut desktop (Mac) — AI menyusun timeline, lalu hasilnya dibuka di CapCut untuk preview dan export.

## Cara kerja

CapCut desktop menyimpan project sebagai folder "draft" berisi `draft_content.json` (timeline: tracks, segments, materials — semua waktu dalam mikrodetik). Server ini men-generate file tersebut langsung, tanpa API perantara, lalu menaruhnya di folder drafts CapCut:

```
~/Movies/CapCut/User Data/Projects/com.lveditor.draft/<nama-project>/
```

Override lokasi dengan env `CAPCUT_DRAFTS_DIR` (dipakai juga untuk testing).

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

Durasi media dibaca otomatis via `ffprobe` (install: `brew install ffmpeg`); tanpa ffprobe, isi parameter `duration` manual.

## Build & pakai

```bash
pnpm install
pnpm build
```

Sudah terdaftar di `.mcp.json` root project, jadi Claude Code memuatnya otomatis. Untuk klien lain (mis. Claude Desktop):

```json
{
  "mcpServers": {
    "capcut": {
      "command": "node",
      "args": ["<path>/capcut-mcp/dist/index.js"]
    }
  }
}
```

## Versioning & release

Project ini memakai [changesets](https://github.com/changesets/changesets):

1. Setiap PR yang mengubah perilaku wajib menyertakan file changeset — jalankan `pnpm changeset`, pilih tipe bump (patch/minor/major), tulis ringkasannya. CI menolak PR tanpa changeset (`pnpm changeset --empty` untuk perubahan yang tidak perlu naik versi).
2. Saat PR masuk ke `main`, workflow Release membuka/meng-update PR **"chore: release"** berisi kenaikan versi + `CHANGELOG.md`.
3. Merge PR release itu → versi resmi naik, git tag dan GitHub Release dibuat otomatis.

## Catatan

- Tutup/restart CapCut setelah `save_draft` supaya project baru muncul di daftar.
- Format draft ini dipakai CapCut versi-versi saat ini; jika suatu saat CapCut mengenkripsi draft-nya (seperti JianYing versi Cina terbaru), pendekatan tulis-file ini perlu disesuaikan.
- Referensi format: [pyJianYingDraft](https://github.com/GuanYixuan/pyJianYingDraft) dan [VectCutAPI](https://github.com/sun-guannan/VectCutAPI).
