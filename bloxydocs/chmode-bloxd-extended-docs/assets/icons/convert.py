import os
import re
import cairosvg

SOURCE_FOLDER = '.'

def convert_svgs_in_folder(folder_path):
    """
    Converts all SVG files in a given folder to PNG format.
    The resulting PNGs will have a white icon on a transparent background.
    """
    if not os.path.isdir(folder_path):
        print(f"Error: Folder not found at '{folder_path}'")
        return

    print(f"Scanning for SVG files in '{os.path.abspath(folder_path)}'...")
    files_in_directory = os.listdir(folder_path)
    svg_files_found = False

    for filename in files_in_directory:
        if filename.lower().endswith('.svg'):
            svg_files_found = True
            input_path = os.path.join(folder_path, filename)
            output_filename = os.path.splitext(filename)[0] + '.png'
            output_path = os.path.join(folder_path, output_filename)

            print(f"  -> Converting '{filename}' to '{output_filename}'...")

            try:
                # Read the SVG content
                with open(input_path, 'r', encoding='utf-8') as f:
                    svg_content = f.read()

                # --- CHANGE 1: More robust way to make the icon white ---
                # Inject a CSS style block to force all SVG elements to have a white fill.
                # This is more reliable than adding an attribute to the <svg> tag.
                style_injection = '<style>* { fill: white !important; }</style>'
                # Use regex to insert the style block right after the opening <svg ...> tag
                svg_content = re.sub(r'(<svg[^>]*>)', r'\1' + style_injection, svg_content, count=1)

                # --- CHANGE 2: Make the background transparent ---
                # By omitting the 'background_color' argument, cairosvg defaults
                # to a transparent background.
                cairosvg.svg2png(
                    bytestring=svg_content.encode('utf-8'),
                    write_to=output_path
                )
            except Exception as e:
                print(f"     [ERROR] Could not convert {filename}: {e}")

    if not svg_files_found:
        print("No SVG files were found in the directory.")

    print("\nConversion complete.")

if __name__ == "__main__":
    convert_svgs_in_folder(SOURCE_FOLDER)