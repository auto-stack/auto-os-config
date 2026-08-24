import { ref } from 'vue'
import { loadAccent, applyAccent } from '../../lib/api'

const current = ref<string>('indigo')

export function useThemeStore(): any {
    const Init = async () => { current.value = await loadAccent();
 }
    const SetAccent = async (name: string) => { current.value = name;
await applyAccent(name);
 }
    return {
        current,
        Init,
        SetAccent,
    }
}
