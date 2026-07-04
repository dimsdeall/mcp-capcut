# mcp-capcut

MCP server untuk mengedit video di **CapCut desktop** lewat AI — kamu tinggal minta (misalnya ke Claude atau Gemini), AI yang menyusun project CapCut-nya, lalu kamu buka di CapCut untuk preview dan export. Mendukung **macOS dan Windows**.

## Bisa apa saja?

| Tool | Fungsi |
|---|---|
| `create_draft` | Membuat project CapCut baru dengan resolusi dan frame rate apa pun (landscape, portrait untuk Reels/TikTok, dll.) |
| `add_video` | Menambahkan klip video atau gambar — bisa dipotong (trim), diatur posisinya di timeline, diubah kecepatan, volume, ukuran, dan letaknya di layar |
| `add_audio` | Menambahkan musik atau voice-over |
| `add_text` | Menambahkan teks/subtitle dengan warna, ukuran, dan posisi bebas |
| `add_subtitles` | Import file subtitle `.srt` sekaligus — semua baris masuk dengan timing otomatis |
| `audio_fade` | Memberi fade in/out pada musik atau voice-over |
| `set_background` | Latar belakang warna solid atau blur untuk klip yang tidak memenuhi layar (mis. video landscape di project portrait) |
| `edit_segment` | Mengubah klip yang sudah ditaruh: geser posisi, ganti kecepatan, volume, ukuran, letak, rotasi, transparansi |
| `remove_segment` | Menghapus klip dari timeline |
| `describe_draft` | Melihat isi timeline project yang sedang disusun |
| `open_draft` | Membuka kembali project yang sudah tersimpan untuk diedit lagi |
| `save_draft` | Menyimpan project langsung ke daftar draft CapCut — tinggal buka CapCut, project-nya sudah ada |
| `list_drafts` | Melihat daftar project, baik yang sedang disusun maupun yang sudah tersimpan |

Contoh, setelah terpasang kamu bisa minta:

> buat video 9:16 dari klip liburan.mp4, ambil detik 5 sampai 15, kasih musik backsound.mp3, dan tulis "Bali 2026" di tengah selama 3 detik pertama

## Cara install

Yang perlu ada di komputermu:

- [CapCut desktop](https://www.capcut.com) (versi gratis cukup) — jalankan minimal sekali setelah install
- [Node.js](https://nodejs.org) versi 24 ke atas
- [ffmpeg](https://ffmpeg.org) *(opsional tapi disarankan — supaya durasi video/audio terbaca otomatis)*: `brew install ffmpeg` di Mac, `winget install ffmpeg` di Windows

Lalu daftarkan server ini ke aplikasi AI-mu dengan config berikut (tidak perlu download apa-apa, semuanya otomatis):

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

### Claude Desktop

Tambahkan config di atas ke file berikut, lalu restart aplikasinya:

- **Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

### Claude Code

Simpan config di atas sebagai `.mcp.json` di folder project-mu, atau supaya aktif di semua project:

```bash
claude mcp add --scope user capcut -- npx -y github:dimsdeall/mcp-capcut
```

### Gemini CLI

Tambahkan config yang sama ke `~/.gemini/settings.json`.

## Tips pemakaian

- Setelah AI menyimpan project (`save_draft`), buka atau restart CapCut — project-nya muncul di daftar draft.
- Kalau CapCut-mu menyimpan draft di lokasi tidak standar, arahkan dengan environment variable `CAPCUT_DRAFTS_DIR`.
