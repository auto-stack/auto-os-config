import { ref } from 'vue'
import { fetchDesktopCfgSafe, putConfigSafe, editField, cfgField } from '../../lib/api'

const module_id = ref<string>('desktop')
const loading = ref<boolean>(false)
const error = ref<string>('')
const section = ref<string>('dock')
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
const wallpaper_draft = ref<string>('')
const wallpaper_saved = ref<string>('0')
const wallpapers_dir_draft = ref<string>('')
const body = ref<string>('{}')

export function useDesktopCfgStore(): any {
    const DraftPinned = (v: string) => { pinned_draft.value = v;
 }
    const DraftWallpaper = (v: string) => { wallpaper_draft.value = v;
 }
    const DraftWallpapersDir = (v: string) => { wallpapers_dir_draft.value = v;
 }
    const Init = async (id: string) => { module_id.value = id;
loading.value = true;
error.value = '';
let r = await fetchDesktopCfgSafe(id);
if (r.ok) {body.value = r.body;
cfg_dock_position.value = await cfgField(body.value, 'cfg_dock_position');
if (cfg_dock_position.value == '') {cfg_dock_position.value = 'bottom';
}cfg_dock_enabled.value = await cfgField(body.value, 'cfg_dock_enabled');
if (cfg_dock_enabled.value == '') {cfg_dock_enabled.value = '1';
}cfg_dock_pinned.value = await cfgField(body.value, 'cfg_dock_pinned');
cfg_wallpaper.value = await cfgField(body.value, 'cfg_wallpaper');
cfg_wallpapers_dir.value = await cfgField(body.value, 'cfg_wallpapers_dir');
cfg_theme.value = await cfgField(body.value, 'cfg_theme');
if (cfg_theme.value == '') {cfg_theme.value = 'dark';
}cfg_transparency.value = await cfgField(body.value, 'cfg_transparency');
if (cfg_transparency.value == '') {cfg_transparency.value = 'off';
}cfg_notes_enabled.value = await cfgField(body.value, 'cfg_notes_enabled');
if (cfg_notes_enabled.value == '') {cfg_notes_enabled.value = '1';
}} else {error.value = r.error;
}
loading.value = false;
 }
    const Nav = (s: string) => { section.value = s;
 }
    const PickEnabled = async (v: string) => { cfg_dock_enabled.value = v;
body.value = await editField(body.value, 'cfg_dock_enabled', v);
let r = await putConfigSafe(module_id.value, body.value);
if (r.ok == false) {error.value = r.error;
}
 }
    const PickNotes = async (v: string) => { cfg_notes_enabled.value = v;
body.value = await editField(body.value, 'cfg_notes_enabled', v);
let r = await putConfigSafe(module_id.value, body.value);
if (r.ok == false) {error.value = r.error;
}
 }
    const PickPosition = async (v: string) => { cfg_dock_position.value = v;
body.value = await editField(body.value, 'cfg_dock_position', v);
let r = await putConfigSafe(module_id.value, body.value);
if (r.ok == false) {error.value = r.error;
}
 }
    const PickTheme = async (v: string) => { cfg_theme.value = v;
body.value = await editField(body.value, 'cfg_theme', v);
let r = await putConfigSafe(module_id.value, body.value);
if (r.ok == false) {error.value = r.error;
}
 }
    const PickTransparency = async (v: string) => { cfg_transparency.value = v;
body.value = await editField(body.value, 'cfg_transparency', v);
let r = await putConfigSafe(module_id.value, body.value);
if (r.ok == false) {error.value = r.error;
}
 }
    const SavePinned = async () => { if (pinned_draft.value != '') {cfg_dock_pinned.value = pinned_draft.value;
body.value = await editField(body.value, 'cfg_dock_pinned', pinned_draft.value);
let r = await putConfigSafe(module_id.value, body.value);
if (r.ok == false) {error.value = r.error;
}pinned_saved.value = '1';
}
 }
    const SaveWallpaper = async () => { if (wallpaper_draft.value != '') {cfg_wallpaper.value = wallpaper_draft.value;
body.value = await editField(body.value, 'cfg_wallpaper', wallpaper_draft.value);
let r = await putConfigSafe(module_id.value, body.value);
if (r.ok == false) {error.value = r.error;
}wallpaper_draft.value = '';
wallpaper_saved.value = '1';
}
 }
    const SaveWallpapersDir = async () => { if (wallpapers_dir_draft.value != '') {cfg_wallpapers_dir.value = wallpapers_dir_draft.value;
body.value = await editField(body.value, 'cfg_wallpapers_dir', wallpapers_dir_draft.value);
let r = await putConfigSafe(module_id.value, body.value);
if (r.ok == false) {error.value = r.error;
}}
 }
    return {
        module_id,
        loading,
        error,
        section,
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
        wallpaper_draft,
        wallpaper_saved,
        wallpapers_dir_draft,
        body,
        DraftPinned,
        DraftWallpaper,
        DraftWallpapersDir,
        Init,
        Nav,
        PickEnabled,
        PickNotes,
        PickPosition,
        PickTheme,
        PickTransparency,
        SavePinned,
        SaveWallpaper,
        SaveWallpapersDir,
    }
}
