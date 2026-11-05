with open('frontend/src/services/supabaseService.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    if 'export const isUUID' in line:
        skip = True
        continue
    if skip and 'test(str);' in line:
        skip = False
        continue
    if not skip:
        new_lines.append(line)

with open('frontend/src/services/supabaseService.ts', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Duplicate isUUID removed successfully.")
