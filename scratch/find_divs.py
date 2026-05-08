
import sys

def find_unbalanced_tags(file_path):
    with open(file_path, 'r') as f:
        lines = f.readlines()
    
    stack = []
    for i, line in enumerate(lines):
        # Very simple tag finding
        parts = line.split('<div')
        for part in parts[1:]:
            stack.append(i + 1)
        
        parts = line.split('</div>')
        for part in parts[1:]:
            if stack:
                stack.pop()
            else:
                print(f"Extra closing div at line {i+1}")
    
    for line_num in stack:
        print(f"Unclosed opening div at line {line_num}")

if __name__ == "__main__":
    find_unbalanced_tags(sys.argv[1])
