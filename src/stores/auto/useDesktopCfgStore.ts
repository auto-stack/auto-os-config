import { ref } from 'vue'
import { fetchDesktopCfgSafe, putConfigSafe, editField, cfgField } from '../../lib/api'
import { useThemeStore } from './useThemeStore'
import { reactive } from 'vue'
const themeStore = reactive(useThemeStore())

const module_id = ref<string>('desktop')
const loading = ref<boolean>(false)
const error = ref<string>('')
const section = ref<string>('appearance')
const accent = ref<string>('indigo')
const cfg_dock_position = ref<string>('bottom')
const cfg_dock_enabled = ref<string>('1')
const cfg_dock_pinned = ref<string>('')
const cfg_wallpaper = ref<string>('')
const cfg_wallpapers_dir = ref<string>('')
const cfg_theme = ref<string>('dark')
const cfg_transparency = ref<string>('off')
const cfg_notes_enabled = ref<string>('1')
const pinned_draft = ref<string>('')
const pinned_saved = ref<string>('0')
const wallpapers_dir_draft = ref<string>('')
const body = ref<string>('{}')

export function useDesktopCfgStore(): any {
    const DraftPinned = (v: string) => { pinned_draft.value = v;
 }
    const DraftWallpapersDir = (v: string) => { wallpapers_dir_draft.value = v;
 }
    const Init = async (id: string) => { module_id.value = id;
loading.value = true;
error.value = '';
let r = await fetchDesktopCfgSafe(id);
if (r.ok) {body.value = r.body;




cfg_dock_position.value = await cfgField(body.value, 'dock_position');
if (cfg_dock_position.value == '') {cfg_dock_position.value = 'bottom';
}cfg_dock_enabled.value = await cfgField(body.value, 'dock_enabled');
if (cfg_dock_enabled.value == 'true') {cfg_dock_enabled.value = '1';
}if (cfg_dock_enabled.value == '' || cfg_dock_enabled.value == 'false') {cfg_dock_enabled.value = '0';
}cfg_dock_pinned.value = await cfgField(body.value, 'dock_pinned');
cfg_wallpaper.value = await cfgField(body.value, 'wallpaper_path');
cfg_wallpapers_dir.value = await cfgField(body.value, 'wallpapers_dir');
cfg_theme.value = await cfgField(body.value, 'dark_theme');
if (cfg_theme.value == 'true') {cfg_theme.value = 'dark';
}if (cfg_theme.value == '' || cfg_theme.value == 'false') {cfg_theme.value = 'light';
}cfg_transparency.value = await cfgField(body.value, 'transparency');
if (cfg_transparency.value == '') {cfg_transparency.value = 'off';
}cfg_notes_enabled.value = await cfgField(body.value, 'notes_enabled');
if (cfg_notes_enabled.value == 'true') {cfg_notes_enabled.value = '1';
}if (cfg_notes_enabled.value == '' || cfg_notes_enabled.value == 'false') {cfg_notes_enabled.value = '0';
}} else {error.value = r.error;
}
loading.value = false;
 }
    const Nav = (s: string) => { section.value = s;
 }
    const PickAccent = (name: string) => { accent.value = name;
themeStore.SetAccent(name);
 }
    const PickEnabled = async (v: string) => { cfg_dock_enabled.value = v;


body.value = await editField(body.value, 'dock_enabled', (() => { if (v == '1') { return 'true'; } else { return 'false'; } })());
let r = await putConfigSafe(module_id.value, body.value);
if (r.ok == false) {error.value = r.error;
}
 }
    const PickNotes = async (v: string) => { cfg_notes_enabled.value = v;
body.value = await editField(body.value, 'notes_enabled', (() => { if (v == '1') { return 'true'; } else { return 'false'; } })());
let r = await putConfigSafe(module_id.value, body.value);
if (r.ok == false) {error.value = r.error;
}
 }
    const PickPosition = async (v: string) => { cfg_dock_position.value = v;
body.value = await editField(body.value, 'dock_position', v);
let r = await putConfigSafe(module_id.value, body.value);
if (r.ok == false) {error.value = r.error;
}
 }
    const PickTheme = async (v: string) => { cfg_theme.value = v;


themeStore.SetMode(v);



body.value = await editField(body.value, 'dark_theme', (() => { if (v == 'dark') { return 'true'; } else { return 'false'; } })());
body.value = await editField(body.value, 'theme_source', 'manual');
let r = await putConfigSafe(module_id.value, body.value);
if (r.ok == false) {error.value = r.error;
}
 }
    const PickTransparency = async (v: string) => { cfg_transparency.value = v;
body.value = await editField(body.value, 'transparency', v);
let r = await putConfigSafe(module_id.value, body.value);
if (r.ok == false) {error.value = r.error;
}
 }
    const RequestWallpaperPick = async () => { let prev = await cfgField(body.value, 'wallpaper_request');
let next: string = '2';
if (prev == '2') {next = '1';
}
body.value = await editField(body.value, 'wallpaper_request', next);
let w = await putConfigSafe(module_id.value, body.value);
if (w.ok == false) {error.value = w.error;
}
 }
    const SavePinned = async () => { if (pinned_draft.value != '') {cfg_dock_pinned.value = pinned_draft.value;
body.value = await editField(body.value, 'dock_pinned', pinned_draft.value);
let r = await putConfigSafe(module_id.value, body.value);
if (r.ok == false) {error.value = r.error;
}pinned_saved.value = '1';
}
 }
    const SaveWallpapersDir = async () => { if (wallpapers_dir_draft.value != '') {cfg_wallpapers_dir.value = wallpapers_dir_draft.value;
body.value = await editField(body.value, 'wallpapers_dir', wallpapers_dir_draft.value);
let r = await putConfigSafe(module_id.value, body.value);
if (r.ok == false) {error.value = r.error;
}}
 }
    return {
        module_id,
        loading,
        error,
        section,
        accent,
        cfg_dock_position,
        cfg_dock_enabled,
        cfg_dock_pinned,
        cfg_wallpaper,
        cfg_wallpapers_dir,
        cfg_theme,
        cfg_transparency,
        cfg_notes_enabled,
        pinned_draft,
        pinned_saved,
        wallpapers_dir_draft,
        body,
        DraftPinned,
        DraftWallpapersDir,
        Init,
        Nav,
        PickAccent,
        PickEnabled,
        PickNotes,
        PickPosition,
        PickTheme,
        PickTransparency,
        RequestWallpaperPick,
        SavePinned,
        SaveWallpapersDir,
    }
}
