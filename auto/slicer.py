import sys, re
full=open('api-full.bak',encoding='utf-8').read()
groups={
 'base':['quote_json','entriesBody','daemon_base'],
 'A':['unquote','new_value_fragment','humanize','is_secret_key','displayOf','enumUrlOfEk','loadEnum'],
 'B':['inferField','inferColumn'],
 'C':['module_entry','fetchModulesViewSafe','getHash','expandGroup_for_alias','expandGroupFor'],
 'D':['fetchConfigSafe','putConfigSafe','deleteBlockSafe','addBlockBody','bodyHas','setBodyField','set_obj_field','removeObj_field_alias','removeObjField','cfgProvider'],
 'E':['bodyEntries','setEntry','setEntryTag','setEntryMulti','is_object_array'],
 'F':['tableCols','tableCells','setCell','removeRowAt','addRow'],
 'G':['fetchCollectionListSafe','fetchEntitySafe','createEntitySafe','putEntitySafe','deleteEntitySafe','filterEntities'],
 'H':['ui_state_path','loadAccent','applyAccent','testDaemon'],
 'X':['get_text','is_transport_error'],
}
want=set()
for g in sys.argv[1].split(','):
    want|=set(groups.get(g,[]))
want|=set(groups['base'])
want|=set(groups['X'])
# parse fn blocks: a block starts at a line 'pub fn NAME(' or 'fn NAME(' and ends at the line that is '}' alone after start
lines=full.split('\n')
blocks=[]
cur=None
for l in lines:
    m=re.match(r'^(pub )?fn ([A-Za-z_0-9]+)\(', l)
    if m:
        if cur: blocks.append(cur)
        cur={'name':m.group(2),'lines':[l]}
        continue
    if cur is not None:
        cur['lines'].append(l)
        if l=='}':
            blocks.append(cur); cur=None
if cur: blocks.append(cur)
out=[]
header='// api.at (sliced for bisect)\n'
for b in blocks:
    if b['name'] in want:
        out.append('\n'.join(b['lines']))
open('src/back/api.at','w',encoding='utf-8').write(header+'\n\n'.join(out)+'\n')
print('kept:',sorted(set(b['name'] for b in blocks if b['name'] in want)))
