import os
import yaml
from jinja2 import Environment, FileSystemLoader

YAML_DIR = '../yaml'
OUTPUT_DIR = '../site/views/metadados'

def main():
    yaml_files = os.listdir(YAML_DIR)
    for filename in yaml_files:
        with open(f'{YAML_DIR}/{filename}', 'r') as f:
            yaml_content = yaml.safe_load(f)

        env = Environment(loader=FileSystemLoader('.'))
        template = env.get_template('templates/metadata.html')

        output = template.render(yaml_content)
        
        output_path = f"{OUTPUT_DIR}/{yaml_content['catalog']}/{yaml_content['schema']}"
        os.makedirs(output_path, exist_ok=True)

        with open(f'{output_path}/{filename.split(".")[0]}.html', 'w') as file:
            file.write(output)

if __name__ == "__main__":
    main()
