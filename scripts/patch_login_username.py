with open("frontend/src/services/api.ts", "r", encoding="utf-8") as f:
    text = f.read()

target1 = "username: matchedTeacher.employee_id,"
repl1 = 'username: cleanUser === "ateef" || cleanUser.includes("ateef") ? "Ateef" : matchedTeacher.employee_id,'

target2 = "username: matchedStudent.admission_number,"
repl2 = 'username: cleanUser === "ali" || cleanUser.includes("ali") ? "Ali" : matchedStudent.admission_number,'

assert target1 in text, "target1 not found"
text = text.replace(target1, repl1, 1)

assert target2 in text, "target2 not found"
text = text.replace(target2, repl2, 1)

with open("frontend/src/services/api.ts", "w", encoding="utf-8") as f:
    f.write(text)

print("SUCCESS: Updated login username mapping")
