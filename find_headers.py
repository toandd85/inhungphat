with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

with open('headers.txt', 'w', encoding='utf-8') as out:
    for i, line in enumerate(lines):
        if 'mobile-back-header' in line:
            out.write(f"Line {i+1}:\n")
            # Print 5 lines before and 15 lines after
            start = max(0, i - 5)
            end = min(len(lines), i + 15)
            for j in range(start, end):
                out.write(f"  {j+1}: {lines[j].strip()}\n")
            out.write("-" * 50 + "\n")
