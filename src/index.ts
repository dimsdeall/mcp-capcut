#!/usr/bin/env node
/**
 * capcut-mcp — MCP server that builds CapCut desktop drafts.
 *
 * Drafts are held in memory while tools compose them; save_draft writes the
 * draft folder into the CapCut drafts root (override with CAPCUT_DRAFTS_DIR).
 * Times in the tool API are in seconds; the draft format itself uses µs.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as fs from "node:fs";
import { Draft, SEC, defaultDraftsRoot, parseSrt, probeMedia } from "./draft.js";

const draftsRoot = process.env.CAPCUT_DRAFTS_DIR || defaultDraftsRoot();
const drafts = new Map<string, Draft>();

function getDraft(name: string): Draft {
  const d = drafts.get(name);
  if (!d) {
    throw new Error(
      `Draft "${name}" tidak ditemukan. Buat dulu dengan create_draft. Draft aktif: ${
        [...drafts.keys()].join(", ") || "(kosong)"
      }`
    );
  }
  return d;
}

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

const pkg = JSON.parse(
  fs.readFileSync(new URL("../package.json", import.meta.url), "utf8")
);

const server = new McpServer({ name: "capcut-mcp", version: pkg.version });

server.tool(
  "create_draft",
  "Buat draft (project) CapCut baru di memori. Panggil save_draft untuk menulisnya ke folder drafts CapCut.",
  {
    name: z.string().describe("Nama project, dipakai sebagai nama folder draft"),
    width: z.number().int().default(1920),
    height: z.number().int().default(1080),
    fps: z.number().default(30),
  },
  async ({ name, width, height, fps }) => {
    if (drafts.has(name)) throw new Error(`Draft "${name}" sudah ada di sesi ini.`);
    drafts.set(name, new Draft(name, width, height, fps));
    return ok({ created: name, canvas: `${width}x${height}@${fps}fps` });
  }
);

server.tool(
  "add_video",
  "Tambahkan klip video atau gambar ke draft. Tanpa targetStart, klip menempel setelah klip terakhir di track yang sama.",
  {
    draft: z.string(),
    filePath: z.string().describe("Path absolut file video/gambar di disk"),
    sourceStart: z.number().default(0).describe("Detik mulai potongan dari file sumber"),
    duration: z.number().optional().describe("Durasi potongan dalam detik. Default: seluruh file (gambar: 5 detik)"),
    targetStart: z.number().optional().describe("Posisi mulai di timeline (detik)"),
    trackIndex: z.number().int().default(0),
    speed: z.number().default(1.0),
    volume: z.number().default(1.0),
    scale: z.number().optional().describe("Skala tampilan, 1.0 = ukuran asli"),
    x: z.number().optional().describe("Posisi horizontal -1..1, 0 = tengah"),
    y: z.number().optional().describe("Posisi vertikal -1..1, 0 = tengah"),
  },
  async (a) => {
    if (!fs.existsSync(a.filePath)) throw new Error(`File tidak ditemukan: ${a.filePath}`);
    const d = getDraft(a.draft);
    const info = probeMedia(a.filePath);
    const isImage = /\.(png|jpe?g|webp|bmp|gif|heic)$/i.test(a.filePath);
    if (!info && !isImage && a.duration === undefined) {
      throw new Error(
        "ffprobe tidak tersedia untuk membaca durasi file. Install ffmpeg (brew install ffmpeg) atau isi parameter duration."
      );
    }
    const mediaDurationUs = info?.durationUs ?? Math.round((a.duration ?? 5) * SEC);
    const segId = d.addVideo({
      filePath: a.filePath,
      mediaDurationUs,
      mediaWidth: info?.width ?? d.width,
      mediaHeight: info?.height ?? d.height,
      hasAudio: info?.hasAudio ?? !isImage,
      sourceStartUs: Math.round(a.sourceStart * SEC),
      sourceDurationUs: a.duration !== undefined ? Math.round(a.duration * SEC) : undefined,
      targetStartUs: a.targetStart !== undefined ? Math.round(a.targetStart * SEC) : undefined,
      trackIndex: a.trackIndex,
      speed: a.speed,
      volume: a.volume,
      transform: { scale: a.scale, x: a.x, y: a.y },
    });
    return ok({ segmentId: segId, timeline: d.describe() });
  }
);

server.tool(
  "add_audio",
  "Tambahkan klip audio (musik, voice-over) ke draft.",
  {
    draft: z.string(),
    filePath: z.string().describe("Path absolut file audio"),
    sourceStart: z.number().default(0),
    duration: z.number().optional().describe("Durasi potongan dalam detik. Default: seluruh file"),
    targetStart: z.number().optional().describe("Posisi mulai di timeline (detik)"),
    trackIndex: z.number().int().default(0),
    volume: z.number().default(1.0),
    speed: z.number().default(1.0),
  },
  async (a) => {
    if (!fs.existsSync(a.filePath)) throw new Error(`File tidak ditemukan: ${a.filePath}`);
    const d = getDraft(a.draft);
    const info = probeMedia(a.filePath);
    if (!info && a.duration === undefined) {
      throw new Error(
        "ffprobe tidak tersedia untuk membaca durasi file. Install ffmpeg (brew install ffmpeg) atau isi parameter duration."
      );
    }
    const segId = d.addAudio({
      filePath: a.filePath,
      mediaDurationUs: info?.durationUs ?? Math.round(a.duration! * SEC),
      sourceStartUs: Math.round(a.sourceStart * SEC),
      sourceDurationUs: a.duration !== undefined ? Math.round(a.duration * SEC) : undefined,
      targetStartUs: a.targetStart !== undefined ? Math.round(a.targetStart * SEC) : undefined,
      trackIndex: a.trackIndex,
      volume: a.volume,
      speed: a.speed,
    });
    return ok({ segmentId: segId, timeline: d.describe() });
  }
);

server.tool(
  "add_text",
  "Tambahkan teks/subtitle ke draft pada rentang waktu tertentu.",
  {
    draft: z.string(),
    text: z.string(),
    start: z.number().describe("Detik mulai teks tampil"),
    duration: z.number().describe("Lama tampil dalam detik"),
    trackIndex: z.number().int().default(0),
    fontSize: z.number().default(15),
    color: z
      .tuple([z.number(), z.number(), z.number()])
      .optional()
      .describe("Warna RGB 0..1, default putih [1,1,1]"),
    x: z.number().default(0).describe("Posisi horizontal -1..1, 0 = tengah"),
    y: z.number().default(-0.8).describe("Posisi vertikal -1..1, -0.8 = bawah (subtitle)"),
  },
  async (a) => {
    const d = getDraft(a.draft);
    const segId = d.addText({
      text: a.text,
      targetStartUs: Math.round(a.start * SEC),
      durationUs: Math.round(a.duration * SEC),
      trackIndex: a.trackIndex,
      fontSize: a.fontSize,
      color: a.color,
      x: a.x,
      y: a.y,
    });
    return ok({ segmentId: segId, timeline: d.describe() });
  }
);

server.tool(
  "open_draft",
  "Buka draft yang sudah ada di folder drafts CapCut untuk diedit lagi di sesi ini.",
  { name: z.string().describe("Nama folder draft di folder drafts CapCut") },
  async ({ name }) => {
    if (drafts.has(name)) return ok(getDraft(name).describe());
    const d = Draft.load(draftsRoot, name);
    drafts.set(name, d);
    return ok(d.describe());
  }
);

server.tool(
  "add_subtitles",
  "Import file .srt sekaligus menjadi banyak segmen teks dengan timing otomatis.",
  {
    draft: z.string(),
    srtPath: z.string().describe("Path absolut file .srt"),
    trackIndex: z.number().int().default(0),
    fontSize: z.number().default(10),
    color: z
      .tuple([z.number(), z.number(), z.number()])
      .optional()
      .describe("Warna RGB 0..1, default putih [1,1,1]"),
    y: z.number().default(-0.8).describe("Posisi vertikal -1..1, -0.8 = bawah"),
    offset: z.number().default(0).describe("Geser semua timing (detik), boleh negatif"),
  },
  async (a) => {
    if (!fs.existsSync(a.srtPath)) throw new Error(`File tidak ditemukan: ${a.srtPath}`);
    const d = getDraft(a.draft);
    const cues = parseSrt(fs.readFileSync(a.srtPath, "utf8"));
    for (const cue of cues) {
      const start = cue.startUs + Math.round(a.offset * SEC);
      d.addText({
        text: cue.text,
        targetStartUs: Math.max(0, start),
        durationUs: cue.endUs - cue.startUs,
        trackIndex: a.trackIndex,
        fontSize: a.fontSize,
        color: a.color,
        y: a.y,
      });
    }
    return ok({ subtitlesAdded: cues.length, timeline: d.describe() });
  }
);

server.tool(
  "edit_segment",
  "Ubah segment yang sudah ada (posisi timeline, kecepatan, volume, ukuran/letak di layar). segmentId didapat dari describe_draft atau hasil add_*.",
  {
    draft: z.string(),
    segmentId: z.string(),
    targetStart: z.number().optional().describe("Posisi mulai baru di timeline (detik)"),
    speed: z.number().optional(),
    volume: z.number().optional(),
    visible: z.boolean().optional(),
    scale: z.number().optional(),
    x: z.number().optional().describe("Posisi horizontal -1..1"),
    y: z.number().optional().describe("Posisi vertikal -1..1"),
    rotation: z.number().optional().describe("Derajat"),
    alpha: z.number().optional().describe("Transparansi 0..1"),
  },
  async (a) => {
    const d = getDraft(a.draft);
    d.editSegment(a.segmentId, {
      targetStartUs: a.targetStart !== undefined ? Math.round(a.targetStart * SEC) : undefined,
      speed: a.speed,
      volume: a.volume,
      visible: a.visible,
      scale: a.scale,
      x: a.x,
      y: a.y,
      rotation: a.rotation,
      alpha: a.alpha,
    });
    return ok(d.describe());
  }
);

server.tool(
  "remove_segment",
  "Hapus segment dari timeline (beserta material-nya bila tidak dipakai segment lain).",
  { draft: z.string(), segmentId: z.string() },
  async ({ draft, segmentId }) => {
    const d = getDraft(draft);
    d.removeSegment(segmentId);
    return ok(d.describe());
  }
);

server.tool(
  "audio_fade",
  "Beri fade in/out pada segment audio.",
  {
    draft: z.string(),
    segmentId: z.string(),
    fadeIn: z.number().default(0).describe("Durasi fade in (detik)"),
    fadeOut: z.number().default(0).describe("Durasi fade out (detik)"),
  },
  async ({ draft, segmentId, fadeIn, fadeOut }) => {
    const d = getDraft(draft);
    d.setAudioFade(segmentId, Math.round(fadeIn * SEC), Math.round(fadeOut * SEC));
    return ok({ segmentId, fadeInSec: fadeIn, fadeOutSec: fadeOut });
  }
);

server.tool(
  "set_background",
  "Atur latar belakang di belakang klip yang tidak memenuhi canvas (mis. video landscape di project portrait): warna solid atau blur.",
  {
    draft: z.string(),
    color: z.string().optional().describe('Warna hex, mis. "#000000"'),
    blur: z.number().min(0).max(1).optional().describe("Kekuatan blur 0..1 (abaikan jika pakai color)"),
  },
  async ({ draft, color, blur }) => {
    const d = getDraft(draft);
    d.setBackground({ color, blur });
    return ok({ background: color ?? `blur ${blur}` });
  }
);

server.tool(
  "describe_draft",
  "Lihat isi timeline sebuah draft (track, segmen, durasi).",
  { draft: z.string() },
  async ({ draft }) => ok(getDraft(draft).describe())
);

server.tool(
  "save_draft",
  "Tulis draft ke folder drafts CapCut sehingga muncul di daftar project CapCut. Tutup CapCut dulu sebelum menyimpan agar daftar project ter-refresh saat dibuka.",
  { draft: z.string() },
  async ({ draft }) => {
    const dir = getDraft(draft).save(draftsRoot);
    return ok({
      saved: dir,
      note: "Buka CapCut — project akan muncul di daftar draft. Jika CapCut sedang terbuka, restart dulu.",
    });
  }
);

server.tool(
  "list_drafts",
  "Daftar draft: yang sedang disusun di sesi ini dan yang sudah ada di folder drafts CapCut.",
  {},
  async () => {
    const onDisk = fs.existsSync(draftsRoot)
      ? fs
          .readdirSync(draftsRoot, { withFileTypes: true })
          .filter((e) => e.isDirectory())
          .map((e) => e.name)
      : [];
    return ok({ inSession: [...drafts.keys()], draftsRoot, onDisk });
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`capcut-mcp ready — drafts root: ${draftsRoot}`);
