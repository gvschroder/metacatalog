import os
import yaml
from jinja2 import Environment, FileSystemLoader

YAML_DIR = '../yaml'
OUTPUT_DIR = '../portal/views/metadados'

def list_yaml(path):
    yaml_files = []
    for root_path, _, filles in os.walk(path):
        for filename in filles:
            if filename.endswith(('.yaml', '.yml')):
                yaml_files.append({
                    "path": os.path.join(root_path, filename),
                    "filename": filename
                })
    return yaml_files

def main():
    for el in list_yaml(YAML_DIR):
        filename = el['filename']
        path = el['path']
        try:
            with open(f'{path}', 'r') as f:
                yaml_content = yaml.safe_load(f)

            env = Environment(loader=FileSystemLoader('.'))
            template = env.get_template('templates/metadata.html')

            output = template.render(yaml_content)
            
            output_path = f"{OUTPUT_DIR}/{yaml_content['catalog']}/{yaml_content['schema']}"
            os.makedirs(output_path, exist_ok=True)

            with open(f'{output_path}/{filename.split(".")[0]}.html', 'w') as file:
                file.write(output)
        except Exception as ex:
            print(f"File: {filename}")
            print(f"Error: {ex}")

if __name__ == "__main__":
    main()
