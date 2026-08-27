const fs = require('fs');
const p = 'auto/src/front/config_editor.at';
let s = fs.readFileSync(p, 'utf8');
const anchor = `                    if .loaded_once == false {
                        button (style: "btn", text: "Load") {
                            onclick: .Load
                        }
                    }
                }
            }
            if .body != "" {`;
const insert = `                    if .loaded_once == false {
                        button (style: "btn", text: "Load") {
                            onclick: .Load
                        }
                    }
                }
            }
            if .confirm_save {
                row (style: "flex items-center gap-3 px-3 py-2 border border-[#e0e0e0] rounded bg-[#ededed]") {
                    text (text: "Save changes to disk? (.bak backup kept)", style: "text-sm text-[#1a1a1a]") {}
                    div (style: "flex-1") {}
                    button (text: "Yes, save", style: "btn px-3 py-1 text-xs rounded bg-primary border-primary text-white") {
                        onclick: .ConfirmSaveYes
                    }
                    button (text: "Cancel", style: "btn px-3 py-1 text-xs rounded border border-[#e0e0e0] bg-white") {
                        onclick: .ConfirmSaveNo
                    }
                }
            }
            if .confirm_del != "" {
                row (style: "flex items-center gap-3 px-3 py-2 border border-[#c42b1c] rounded bg-[#ededed]") {
                    text (text: "Delete block " + .confirm_del + "? (.bak kept)", style: "text-sm text-[#c42b1c]") {}
                    div (style: "flex-1") {}
                    button (text: "Yes, delete", style: "btn px-3 py-1 text-xs rounded bg-[#c42b1c] border-[#c42b1c] text-white") {
                        onclick: .ConfirmDeleteYes
                    }
                    button (text: "Cancel", style: "btn px-3 py-1 text-xs rounded border border-[#e0e0e0] bg-white") {
                        onclick: .ConfirmDeleteNo
                    }
                }
            }
            if .body != "" {`;
if (!s.includes(anchor)) { console.error('anchor not found'); process.exit(1); }
s = s.replace(anchor, insert);
fs.writeFileSync(p, s);
console.log('confirm blocks restored');
