/**
 * CapCut draft model.
 *
 * A CapCut desktop project ("draft") is a folder inside the drafts root
 * containing draft_content.json (the timeline) and draft_meta_info.json.
 * All timestamps are in MICROSECONDS.
 *
 * Format reference: the draft files written by CapCut desktop, as documented
 * by the pyJianYingDraft / VectCutAPI projects.
 */
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

export const SEC = 1_000_000; // microseconds per second

const uuid = () => randomUUID().toUpperCase();

export function defaultDraftsRoot(): string {
  if (process.platform === "win32") {
    const localAppData =
      process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
    return path.join(
      localAppData,
      "CapCut",
      "User Data",
      "Projects",
      "com.lveditor.draft"
    );
  }
  return path.join(
    os.homedir(),
    "Movies",
    "CapCut",
    "User Data",
    "Projects",
    "com.lveditor.draft"
  );
}

// ---------- media probing ----------

export interface MediaInfo {
  durationUs: number;
  width: number;
  height: number;
  hasAudio: boolean;
}

/** Probe a media file with ffprobe if available; returns null when not installed. */
export function probeMedia(file: string): MediaInfo | null {
  try {
    const out = execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
        file,
      ],
      { encoding: "utf8" }
    );
    const info = JSON.parse(out);
    const video = info.streams?.find((s: any) => s.codec_type === "video");
    const audio = info.streams?.find((s: any) => s.codec_type === "audio");
    const durationSec = parseFloat(
      info.format?.duration ?? video?.duration ?? audio?.duration ?? "0"
    );
    return {
      durationUs: Math.round(durationSec * SEC),
      width: video?.width ?? 0,
      height: video?.height ?? 0,
      hasAudio: Boolean(audio),
    };
  } catch {
    return null;
  }
}

// ---------- segment helper templates ----------

function speedMaterial() {
  return { curve_speed: null, id: uuid(), mode: 0, speed: 1.0, type: "speed" };
}

function canvasMaterial() {
  return {
    album_image: "",
    blur: 0.0,
    color: "",
    id: uuid(),
    image: "",
    image_id: "",
    image_name: "",
    source_platform: 0,
    team_id: "",
    type: "canvas_color",
  };
}

function soundChannelMapping() {
  return { audio_channel_mapping: 0, id: uuid(), is_config_open: false, type: "" };
}

function vocalSeparation() {
  return { choice: 0, id: uuid(), production_path: "", time_range: null, type: "vocal_separation" };
}

function clipSettings(opts: TransformOptions = {}) {
  return {
    alpha: opts.alpha ?? 1.0,
    flip: { horizontal: false, vertical: false },
    rotation: opts.rotation ?? 0.0,
    scale: { x: opts.scale ?? 1.0, y: opts.scale ?? 1.0 },
    transform: { x: opts.x ?? 0.0, y: opts.y ?? 0.0 },
  };
}

export interface TransformOptions {
  x?: number;
  y?: number;
  scale?: number;
  rotation?: number;
  alpha?: number;
}

function baseSegment(
  materialId: string,
  sourceStartUs: number,
  targetStartUs: number,
  durationUs: number,
  extraRefs: string[],
  opts: { speed?: number; volume?: number; transform?: TransformOptions } = {}
) {
  return {
    cartoon: false,
    clip: clipSettings(opts.transform),
    common_keyframes: [],
    enable_adjust: true,
    enable_color_curves: true,
    enable_color_match_adjust: false,
    enable_color_wheels: true,
    enable_lut: true,
    enable_smart_color_adjust: false,
    extra_material_refs: extraRefs,
    group_id: "",
    hdr_settings: { intensity: 1.0, mode: 1, nits: 1000 },
    id: uuid(),
    intensifies_audio: false,
    is_placeholder: false,
    is_tone_modify: false,
    keyframe_refs: [],
    last_nonzero_volume: 1.0,
    material_id: materialId,
    render_index: 0,
    responsive_layout: {
      enable: false,
      horizontal_pos_layout: 0,
      size_layout: 0,
      target_follow: "",
      vertical_pos_layout: 0,
    },
    reverse: false,
    source_timerange: { duration: durationUs, start: sourceStartUs },
    speed: opts.speed ?? 1.0,
    target_timerange: {
      duration: Math.round(durationUs / (opts.speed ?? 1.0)),
      start: targetStartUs,
    },
    template_id: "",
    template_scene: "default",
    track_attribute: 0,
    track_render_index: 0,
    uniform_scale: { on: true, value: 1.0 },
    visible: true,
    volume: opts.volume ?? 1.0,
  };
}

// ---------- the draft ----------

export class Draft {
  readonly id = uuid();
  name: string;
  width: number;
  height: number;
  fps: number;
  private content: any;

  constructor(name: string, width = 1920, height = 1080, fps = 30) {
    this.name = name;
    this.width = width;
    this.height = height;
    this.fps = fps;
    this.content = this.emptyContent();
  }

  private emptyContent() {
    return {
      canvas_config: { height: this.height, ratio: "original", width: this.width },
      color_space: 0,
      config: {
        adjust_max_index: 1,
        attachment_info: [],
        combination_max_index: 1,
        export_range: null,
        extract_audio_last_index: 1,
        lyrics_recognition_id: "",
        lyrics_sync: true,
        lyrics_taskinfo: [],
        maintrack_adsorb: true,
        material_save_mode: 0,
        multi_language_current: "none",
        multi_language_list: [],
        multi_language_main: "none",
        multi_language_mode: "none",
        original_sound_last_index: 1,
        record_audio_last_index: 1,
        sticker_max_index: 1,
        subtitle_keywords_config: null,
        subtitle_recognition_id: "",
        subtitle_sync: true,
        subtitle_taskinfo: [],
        system_font_list: [],
        video_mute: false,
        zoom_info_params: null,
      },
      cover: null,
      create_time: 0,
      duration: 0,
      extra_info: null,
      fps: this.fps,
      free_render_index_mode_on: false,
      group_container: null,
      id: this.id,
      keyframe_graph_list: [],
      keyframes: {
        adjusts: [],
        audios: [],
        effects: [],
        filters: [],
        handwrites: [],
        stickers: [],
        texts: [],
        videos: [],
      },
      last_modified_platform: this.platform(),
      materials: {
        ai_translates: [],
        audio_balances: [],
        audio_effects: [],
        audio_fades: [],
        audio_track_indexes: [],
        audios: [],
        beats: [],
        canvases: [],
        chromas: [],
        color_curves: [],
        digital_humans: [],
        drafts: [],
        effects: [],
        flowers: [],
        green_screens: [],
        handwrites: [],
        hsl: [],
        images: [],
        log_color_wheels: [],
        loudnesses: [],
        manual_deformations: [],
        masks: [],
        material_animations: [],
        material_colors: [],
        multi_language_refs: [],
        placeholders: [],
        plugin_effects: [],
        primary_color_wheels: [],
        realtime_denoises: [],
        shapes: [],
        smart_crops: [],
        smart_relights: [],
        sound_channel_mappings: [],
        speeds: [],
        stickers: [],
        tail_leaders: [],
        text_templates: [],
        texts: [],
        time_marks: [],
        transitions: [],
        video_effects: [],
        video_trackings: [],
        videos: [],
        vocal_beautifys: [],
        vocal_separations: [],
      },
      mutable_config: null,
      name: "",
      new_version: "110.0.0",
      platform: this.platform(),
      relationships: [],
      render_index_track_mode_on: false,
      retouch_cover: null,
      source: "default",
      static_cover_image_path: "",
      time_marks: null,
      tracks: [],
      update_time: 0,
      version: 360000,
    };
  }

  private platform() {
    return {
      app_id: 359289,
      app_source: "cc",
      app_version: "5.9.0",
      device_id: "unknown",
      hard_disk_id: "unknown",
      mac_address: "unknown",
      os: "mac",
      os_version: os.release(),
    };
  }

  get durationUs(): number {
    return this.content.duration;
  }

  private track(type: "video" | "audio" | "text", index = 0): any {
    const tracks = this.content.tracks.filter((t: any) => t.type === type);
    while (tracks.length <= index) {
      const t = {
        attribute: 0,
        flag: type === "text" ? 1 : 0,
        id: uuid(),
        is_default_name: true,
        name: "",
        segments: [],
        type,
      };
      this.content.tracks.push(t);
      tracks.push(t);
    }
    return tracks[index];
  }

  /** End position (µs) of the last segment on a track — used to append clips. */
  trackEndUs(type: "video" | "audio" | "text", index = 0): number {
    const tracks = this.content.tracks.filter((t: any) => t.type === type);
    const t = tracks[index];
    if (!t || t.segments.length === 0) return 0;
    const last = t.segments[t.segments.length - 1].target_timerange;
    return last.start + last.duration;
  }

  private bumpDuration(endUs: number) {
    if (endUs > this.content.duration) this.content.duration = endUs;
  }

  addVideo(opts: {
    filePath: string;
    mediaDurationUs: number;
    mediaWidth: number;
    mediaHeight: number;
    hasAudio: boolean;
    sourceStartUs?: number;
    sourceDurationUs?: number;
    targetStartUs?: number;
    trackIndex?: number;
    speed?: number;
    volume?: number;
    transform?: TransformOptions;
  }): string {
    const m = this.content.materials;
    const isImage = /\.(png|jpe?g|webp|bmp|gif|heic)$/i.test(opts.filePath);
    const material = {
      aigc_type: "none",
      audio_fade: null,
      cartoon_path: "",
      category_id: "",
      category_name: "local",
      check_flag: 63487,
      crop: {
        lower_left_x: 0.0,
        lower_left_y: 1.0,
        lower_right_x: 1.0,
        lower_right_y: 1.0,
        upper_left_x: 0.0,
        upper_left_y: 0.0,
        upper_right_x: 1.0,
        upper_right_y: 0.0,
      },
      crop_ratio: "free",
      crop_scale: 1.0,
      duration: isImage ? 10800 * SEC : opts.mediaDurationUs,
      extra_type_option: 0,
      formula_id: "",
      freeze: null,
      has_audio: opts.hasAudio,
      height: opts.mediaHeight,
      id: uuid(),
      intensifies_audio_path: "",
      intensifies_path: "",
      is_ai_generate_content: false,
      is_copyright: false,
      is_text_edit_overdub: false,
      is_unified_beauty_mode: false,
      local_id: "",
      local_material_id: "",
      material_id: "",
      material_name: path.basename(opts.filePath),
      material_url: "",
      matting: {
        flag: 0,
        has_use_quick_brush: false,
        has_use_quick_eraser: false,
        interactiveTime: [],
        path: "",
        strokes: [],
      },
      media_path: "",
      object_locked: null,
      origin_material_id: "",
      path: opts.filePath,
      picture_from: "none",
      picture_set_category_id: "",
      picture_set_category_name: "",
      request_id: "",
      reverse_intensifies_path: "",
      reverse_path: "",
      smart_motion: null,
      source: 0,
      source_platform: 0,
      stable: {
        matrix_path: "",
        stable_level: 0,
        time_range: { duration: 0, start: 0 },
      },
      team_id: "",
      type: isImage ? "photo" : "video",
      video_algorithm: {
        algorithms: [],
        complement_frame_config: null,
        deflicker: null,
        gameplay_configs: [],
        motion_blur_config: null,
        noise_reduction: null,
        path: "",
        quality_enhance: null,
        time_range: null,
      },
      width: opts.mediaWidth,
    };
    m.videos.push(material);

    const speed = speedMaterial();
    const canvas = canvasMaterial();
    const scm = soundChannelMapping();
    const vs = vocalSeparation();
    m.speeds.push(speed);
    m.canvases.push(canvas);
    m.sound_channel_mappings.push(scm);
    m.vocal_separations.push(vs);

    const trackIndex = opts.trackIndex ?? 0;
    const targetStart = opts.targetStartUs ?? this.trackEndUs("video", trackIndex);
    const srcDuration =
      opts.sourceDurationUs ?? (isImage ? 5 * SEC : opts.mediaDurationUs);
    const seg = baseSegment(
      material.id,
      opts.sourceStartUs ?? 0,
      targetStart,
      srcDuration,
      [speed.id, canvas.id, scm.id, vs.id],
      { speed: opts.speed, volume: opts.volume, transform: opts.transform }
    );
    this.track("video", trackIndex).segments.push(seg);
    this.bumpDuration(seg.target_timerange.start + seg.target_timerange.duration);
    return seg.id;
  }

  addAudio(opts: {
    filePath: string;
    mediaDurationUs: number;
    sourceStartUs?: number;
    sourceDurationUs?: number;
    targetStartUs?: number;
    trackIndex?: number;
    volume?: number;
    speed?: number;
  }): string {
    const m = this.content.materials;
    const material = {
      app_id: 0,
      category_id: "",
      category_name: "local",
      check_flag: 1,
      copyright_limit_type: "none",
      duration: opts.mediaDurationUs,
      effect_id: "",
      formula_id: "",
      id: uuid(),
      intensifies_path: "",
      is_ai_clone_tone: false,
      is_text_edit_overdub: false,
      is_ugc: false,
      local_material_id: "",
      music_id: "",
      name: path.basename(opts.filePath),
      path: opts.filePath,
      query: "",
      request_id: "",
      resource_id: "",
      search_id: "",
      source_from: "",
      source_platform: 0,
      team_id: "",
      text_id: "",
      tone_category_id: "",
      tone_category_name: "",
      tone_effect_id: "",
      tone_effect_name: "",
      tone_platform: "",
      tone_second_category_id: "",
      tone_second_category_name: "",
      tone_speaker: "",
      tone_type: "",
      type: "extract_music",
      video_id: "",
      wave_points: [],
    };
    m.audios.push(material);

    const speed = speedMaterial();
    const scm = soundChannelMapping();
    const vs = vocalSeparation();
    m.speeds.push(speed);
    m.sound_channel_mappings.push(scm);
    m.vocal_separations.push(vs);

    const trackIndex = opts.trackIndex ?? 0;
    const targetStart = opts.targetStartUs ?? this.trackEndUs("audio", trackIndex);
    const seg = baseSegment(
      material.id,
      opts.sourceStartUs ?? 0,
      targetStart,
      opts.sourceDurationUs ?? opts.mediaDurationUs,
      [speed.id, scm.id, vs.id],
      { speed: opts.speed, volume: opts.volume }
    );
    this.track("audio", trackIndex).segments.push(seg);
    this.bumpDuration(seg.target_timerange.start + seg.target_timerange.duration);
    return seg.id;
  }

  addText(opts: {
    text: string;
    targetStartUs: number;
    durationUs: number;
    trackIndex?: number;
    /** [r, g, b] each 0..1 */
    color?: [number, number, number];
    fontSize?: number;
    /** -1..1, 0 = center; y -0.8 is near the bottom */
    x?: number;
    y?: number;
  }): string {
    const m = this.content.materials;
    const color = opts.color ?? [1, 1, 1];
    const fontSize = opts.fontSize ?? 15;
    const contentJson = {
      styles: [
        {
          fill: { alpha: 1.0, content: { render_type: "solid", solid: { alpha: 1.0, color } } },
          range: [0, opts.text.length],
          size: fontSize,
          bold: false,
          italic: false,
          strokes: [
            {
              content: { solid: { alpha: 1.0, color: [0, 0, 0] } },
              width: 0.08,
            },
          ],
        },
      ],
      text: opts.text,
    };
    const material = {
      add_type: 0,
      alignment: 1,
      background_alpha: 1.0,
      background_color: "",
      background_height: 0.14,
      background_horizontal_offset: 0.0,
      background_round_radius: 0.0,
      background_style: 0,
      background_vertical_offset: 0.0,
      background_width: 0.14,
      base_content: "",
      bold_width: 0.0,
      border_alpha: 1.0,
      border_color: "",
      border_width: 0.08,
      caption_template_info: {
        category_id: "",
        category_name: "",
        effect_id: "",
        is_new: false,
        path: "",
        request_id: "",
        resource_id: "",
        resource_name: "",
        source_platform: 0,
      },
      check_flag: 7,
      combo_info: { text_templates: [] },
      content: JSON.stringify(contentJson),
      fixed_height: -1.0,
      fixed_width: -1.0,
      font_category_id: "",
      font_category_name: "",
      font_id: "",
      font_name: "",
      font_path: "",
      font_resource_id: "",
      font_size: fontSize,
      font_source_platform: 0,
      font_team_id: "",
      font_title: "none",
      font_url: "",
      fonts: [],
      force_apply_line_max_width: false,
      global_alpha: 1.0,
      group_id: "",
      has_shadow: false,
      id: uuid(),
      initial_scale: 1.0,
      inner_padding: -1.0,
      is_rich_text: false,
      italic_degree: 0,
      ktv_color: "",
      language: "",
      layer_weight: 1,
      letter_spacing: 0.0,
      line_feed: 1,
      line_max_width: 0.82,
      line_spacing: 0.02,
      multi_language_current: "none",
      name: "",
      original_size: [],
      preset_category: "",
      preset_category_id: "",
      preset_has_set_alignment: false,
      preset_id: "",
      preset_index: 0,
      preset_name: "",
      recognize_task_id: "",
      recognize_type: 0,
      relevance_segment: [],
      shadow_alpha: 0.9,
      shadow_angle: -45.0,
      shadow_color: "",
      shadow_distance: 5.0,
      shadow_point: { x: 0.6363961030678928, y: -0.6363961030678928 },
      shadow_smoothing: 0.45,
      shape_clip_x: false,
      shape_clip_y: false,
      source_from: "",
      style_name: "",
      sub_type: 0,
      subtitle_keywords: null,
      subtitle_template_original_fontsize: 0.0,
      text_alpha: 1.0,
      text_color: "#FFFFFF",
      text_curve: null,
      text_preset_resource_id: "",
      text_size: 30,
      text_to_audio_ids: [],
      tts_auto_update: false,
      type: "text",
      typesetting: 0,
      underline: false,
      underline_offset: 0.22,
      underline_width: 0.05,
      use_effect_default_color: true,
      words: { end_time: [], start_time: [], text: [] },
    };
    m.texts.push(material);

    const trackIndex = opts.trackIndex ?? 0;
    const seg: any = baseSegment(
      material.id,
      0,
      opts.targetStartUs,
      opts.durationUs,
      [],
      { transform: { x: opts.x ?? 0, y: opts.y ?? -0.8 } }
    );
    seg.source_timerange = null; // text segments have no source media
    this.track("text", trackIndex).segments.push(seg);
    this.bumpDuration(opts.targetStartUs + opts.durationUs);
    return seg.id;
  }

  /** Human-readable timeline overview for the describe_draft tool. */
  describe() {
    return {
      id: this.id,
      name: this.name,
      canvas: `${this.width}x${this.height}@${this.fps}fps`,
      durationSec: this.content.duration / SEC,
      tracks: this.content.tracks.map((t: any) => ({
        type: t.type,
        segments: t.segments.map((s: any) => ({
          startSec: s.target_timerange.start / SEC,
          durationSec: s.target_timerange.duration / SEC,
          materialId: s.material_id,
        })),
      })),
    };
  }

  /** Write the draft folder into draftsRoot and return its path. */
  save(draftsRoot: string): string {
    const dir = path.join(draftsRoot, this.name);
    fs.mkdirSync(dir, { recursive: true });
    const nowUs = Date.now() * 1000;
    this.content.update_time = nowUs;

    fs.writeFileSync(
      path.join(dir, "draft_content.json"),
      JSON.stringify(this.content)
    );

    const meta = {
      cloud_package_completed_time: "",
      draft_cloud_capcut_purchase_info: "",
      draft_cloud_last_action_download: false,
      draft_cloud_materials: [],
      draft_cloud_purchase_info: "",
      draft_cloud_template_id: "",
      draft_cloud_tutorial_info: "",
      draft_cloud_videocut_purchase_info: "",
      draft_cover: "draft_cover.jpg",
      draft_deeplink_url: "",
      draft_enterprise_info: {
        draft_enterprise_extra: "",
        draft_enterprise_id: "",
        draft_enterprise_name: "",
        enterprise_material: [],
      },
      draft_fold_path: dir,
      draft_id: this.id,
      draft_is_ai_packaging_used: false,
      draft_is_ai_shorts: false,
      draft_is_ai_translate: false,
      draft_is_article_video_draft: false,
      draft_is_from_deeplink: "false",
      draft_is_invisible: false,
      draft_materials: [
        { type: 0, value: [] },
        { type: 1, value: [] },
        { type: 2, value: [] },
        { type: 3, value: [] },
        { type: 6, value: [] },
        { type: 7, value: [] },
        { type: 8, value: [] },
      ],
      draft_materials_copied_info: [],
      draft_name: this.name,
      draft_new_version: "",
      draft_removable_storage_device: "",
      draft_root_path: draftsRoot,
      draft_segment_extra_info: [],
      draft_timeline_materials_size_: 0,
      draft_type: "",
      tm_draft_cloud_completed: "",
      tm_draft_cloud_modified: 0,
      tm_draft_create: nowUs,
      tm_draft_modified: nowUs,
      tm_draft_removed: 0,
      tm_duration: this.content.duration,
    };
    fs.writeFileSync(
      path.join(dir, "draft_meta_info.json"),
      JSON.stringify(meta)
    );
    return dir;
  }
}
