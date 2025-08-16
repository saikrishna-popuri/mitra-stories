# compositor.py (Updated for Layer Glows and Highlights)

import sys
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

class StoryCompositor:
    """
    A class to handle the composition of story pages from assets.
    """
    def __init__(self, config_path: str):
        self.config_path = Path(config_path)
        self.config = self._load_config()
        self.base_dir = self.config_path.parent
        self.templates_dir = self.base_dir / "story_templates"
        self.sprites_dir = self.base_dir / "story_sprites"
        self.fonts_dir = self.base_dir / "fonts"
        self.output_dir = self.base_dir / "story_final"
        self._validate_directories()

    def _load_config(self) -> dict:
        if not self.config_path.exists():
            print(f"❌ Error: Config file not found at '{self.config_path}'")
            sys.exit(1)
        try:
            with open(self.config_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except json.JSONDecodeError:
            print(f"❌ Error: Could not decode JSON from '{self.config_path}'.")
            sys.exit(1)

    def _validate_directories(self):
        for dir_path in [self.templates_dir, self.sprites_dir, self.fonts_dir]:
            if not dir_path.exists():
                dir_path.mkdir(parents=True, exist_ok=True)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        print(f"✅ Output directory is ready at: '{self.output_dir}'")

    def _find_and_open_image(self, path: Path) -> Image.Image:
        """Finds and opens an image, trying common extensions."""
        if path.exists():
            return Image.open(path).convert("RGBA")

        base = path.with_suffix('')
        for ext in ('.jpg', '.jpeg', '.png'):
            new_path = base.with_suffix(ext)
            if new_path.exists():
                print(f"   - INFO: '{path.name}' not found, using '{new_path.name}' instead.")
                return Image.open(new_path).convert("RGBA")
        
        raise FileNotFoundError(f"Cannot find {base.name} with .jpg, .jpeg, or .png extension.")
    def _apply_edge_blur(self, image: Image.Image, radius: int) -> Image.Image:
        if radius <= 0: return image
        alpha = image.getchannel('A')
        blurred_alpha = alpha.filter(ImageFilter.GaussianBlur(radius))
        blurred_image = Image.new('RGBA', image.size, (0, 0, 0, 0))
        blurred_image.paste(image, (0, 0), mask=blurred_alpha)
        return blurred_image

    def _apply_transformations(self, image: Image.Image, settings: dict) -> Image.Image:
        # Brightness and Contrast
        brightness = settings.get("brightness", 1.0)
        if brightness != 1.0:
            enhancer = ImageEnhance.Brightness(image)
            image = enhancer.enhance(brightness)
        
        contrast = settings.get("contrast", 1.0)
        if contrast != 1.0:
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(contrast)

        # Scale, Flip, Rotate
        scale = settings.get("scale", 1.0)
        if scale != 1.0:
            new_size = (int(image.width * scale), int(image.height * scale))
            image = image.resize(new_size, Image.Resampling.LANCZOS)
        flip_mode = settings.get("flip", "none").lower()
        if flip_mode == "horizontal": image = image.transpose(Image.FLIP_LEFT_RIGHT)
        elif flip_mode == "vertical": image = image.transpose(Image.FLIP_TOP_BOTTOM)
        rotation = settings.get("rotation", 0)
        if rotation != 0: image = image.rotate(rotation, expand=True, resample=Image.BICUBIC)
        return image

    def _draw_text_boxes(self, canvas: Image.Image, text_boxes: list) -> Image.Image:
        # ... (no changes in this function) ...
        for box in text_boxes:
            temp_canvas = canvas.copy()
            if box.get('enable_glow', False):
                mask = Image.new('L', temp_canvas.size, 0)
                mask_draw = ImageDraw.Draw(mask)
                rect = (box['x'], box['y'], box['x'] + box['width'], box['y'] + box['height'])
                corner_radius = box.get('corner_radius', 15)
                mask_draw.rounded_rectangle(rect, radius=corner_radius, fill=255)
                glow_radius = box.get('glow_radius', 15)
                if glow_radius > 0:
                    blurred_mask = mask.filter(ImageFilter.GaussianBlur(radius=glow_radius))
                else:
                    blurred_mask = mask
                glow_color = tuple(box.get('glow_color', [255, 255, 255]))
                color_layer = Image.new('RGBA', temp_canvas.size, glow_color)
                color_layer.putalpha(blurred_mask)
                temp_canvas = Image.alpha_composite(temp_canvas, color_layer)

            final_draw = ImageDraw.Draw(temp_canvas, 'RGBA')
            rect = (box['x'], box['y'], box['x'] + box['width'], box['y'] + box['height'])
            opacity = box.get('opacity', 0.0)
            if opacity > 0:
                box_color = tuple(box.get('box_color', [0, 0, 0]) + [int(255 * opacity)])
                corner_radius = box.get('corner_radius', 15)
                final_draw.rounded_rectangle(rect, radius=corner_radius, fill=box_color)

            try:
                font_path = str(self.fonts_dir / box.get('font', 'default.ttf'))
                font = ImageFont.truetype(font_path, size=box.get('font_size', 24))
            except IOError:
                font = ImageFont.load_default()

            text = box.get('text', '')
            lines = [line.strip() for line in text.split('||')]
            line_spacing = box.get('line_spacing', 10)
            
            line_heights = [final_draw.textbbox((0,0), line, font=font)[3] - final_draw.textbbox((0,0), line, font=font)[1] for line in lines]
            total_text_height = sum(line_heights) + max(0, len(lines) - 1) * line_spacing
            
            align = box.get('align', 'left')
            padding = box.get('padding', 10)
            box_x, box_y, box_width, box_height = rect[0], rect[1], box['width'], box['height']

            if align == 'center':
                current_y = box_y + (box_height - total_text_height) / 2
            else: 
                current_y = box_y + padding

            vertical_offset = box.get('offset', 0)
            current_y -= vertical_offset 

            for i, line in enumerate(lines):
                if align == 'center':
                    line_width = final_draw.textlength(line, font=font)
                    current_x = box_x + (box_width - line_width) / 2
                else: 
                    current_x = box_x + padding
                
                position = (current_x, current_y)

                if box.get('enable_shadow', False):
                    shadow_color = tuple(box.get('shadow_color', [0, 0, 0]))
                    shadow_offset = box.get('shadow_offset', [2, 2])
                    shadow_blur = box.get('shadow_blur', 3)
                    shadow_pos = (position[0] + shadow_offset[0], position[1] + shadow_offset[1])
                    
                    shadow_layer = Image.new('RGBA', temp_canvas.size, (0,0,0,0))
                    shadow_draw = ImageDraw.Draw(shadow_layer)
                    shadow_draw.text(shadow_pos, line, font=font, fill=shadow_color, anchor='lt')
                    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(radius=shadow_blur))
                    temp_canvas.paste(shadow_layer, (0,0), shadow_layer)
                    final_draw = ImageDraw.Draw(temp_canvas)

                stroke_width = box.get('stroke_width', 0)
                stroke_color = tuple(box.get('stroke_color', [255, 255, 255]))
                text_color = tuple(box.get('text_color', [255, 255, 255]))
                final_draw.text(position, line, font=font, fill=text_color, anchor='lt',
                                stroke_width=stroke_width, stroke_fill=stroke_color)

                current_y += line_heights[i] + line_spacing
            
            canvas = temp_canvas

        return canvas

    def _create_circular_crop(self, image_path: Path, size: int) -> Image.Image:
        img = self._find_and_open_image(image_path)
        img = img.resize((size, size), Image.Resampling.LANCZOS)
        mask = Image.new('L', (size, size), 0)
        draw = ImageDraw.Draw(mask)
        draw.ellipse((0, 0, size, size), fill=255)
        img.putalpha(mask)
        return img
    
    # --- NEW HELPER FUNCTION ---
    def _create_layer_glow(self, canvas_size: tuple, layer: Image.Image, position: tuple, settings: dict) -> Image.Image:
        """Creates a blurred glow effect for a given layer."""
        # Create a mask from the layer's alpha channel
        mask = layer.getchannel('A')
        
        # Create a solid color layer for the glow
        glow_color = tuple(settings.get('layer_glow_color', [255, 255, 255]))
        glow_layer = Image.new('RGBA', layer.size, glow_color)
        
        # Apply the mask to the color layer
        glow_layer.putalpha(mask)
        
        # Blur the entire glow layer
        glow_radius = settings.get('layer_glow_radius', 15)
        if glow_radius > 0:
            glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(radius=glow_radius))
        
        # Create a full-size canvas for the glow to composite it correctly
        final_glow_canvas = Image.new('RGBA', canvas_size, (0,0,0,0))
        final_glow_canvas.paste(glow_layer, position, glow_layer)
        
        return final_glow_canvas

    def run(self):
        """Executes the main composition logic for all pages in the config."""
        print("\n" + "="*50 + "\n🚀 Starting Story Page Composition Process\n" + "="*50)
        for page_name, settings in self.config.items():
            try:
                print(f"\nAssembling '{page_name}'...")
                template_path = self.templates_dir / settings['template_file']
                canvas = self._find_and_open_image(template_path)

                for layer_data in settings.get('layers', []):
                    # Step 1: Create the base sprite
                    layer_type = layer_data.get('type', 'sprite')
                    sprite_path = self.sprites_dir / layer_data['filename']
                    if layer_type == 'circular_crop':
                        crop_size = layer_data.get('size', 450)
                        sprite = self._create_circular_crop(sprite_path, crop_size)
                    else: # Default is 'sprite'
                        sprite = self._find_and_open_image(sprite_path)

                    # Step 2: Apply edge blur to the sprite itself
                    blur_radius = layer_data.get('edge_blur', 0)
                    if blur_radius > 0:
                        sprite = self._apply_edge_blur(sprite, blur_radius)

                    # Step 3: Apply transformations (brightness, contrast, scale, etc.)
                    transformed_sprite = self._apply_transformations(sprite, layer_data)
                    position = tuple(layer_data['position'])

                    # --- NEW: Add Layer Drop Shadow (BEHIND the sprite) ---
                    if layer_data.get('enable_layer_shadow', False):
                        print(f"   - Adding drop shadow to '{layer_data['filename']}'")
                        shadow_color = tuple(layer_data.get('layer_shadow_color', [0,0,0]))
                        shadow_offset = layer_data.get('layer_shadow_offset', [5,5])
                        shadow_blur = layer_data.get('layer_shadow_blur', 5)

                        # Create a colored silhouette from the sprite's alpha channel
                        alpha = transformed_sprite.getchannel('A')
                        shadow_silhouette = Image.new('RGBA', transformed_sprite.size, shadow_color)
                        shadow_silhouette.putalpha(alpha)
                        
                        # Blur the silhouette and paste it at an offset
                        blurred_shadow = shadow_silhouette.filter(ImageFilter.GaussianBlur(radius=shadow_blur))
                        shadow_position = (position[0] + shadow_offset[0], position[1] + shadow_offset[1])
                        canvas.paste(blurred_shadow, shadow_position, blurred_shadow)

                    # Step 4: Add layer glow (BEHIND the sprite)
                    if layer_data.get('enable_layer_glow', False):
                        glow_canvas = self._create_layer_glow(canvas.size, transformed_sprite, position, layer_data)
                        canvas = Image.alpha_composite(canvas, glow_canvas)

                    # Step 5: Paste the final sprite on top of everything
                    canvas.paste(transformed_sprite, position, transformed_sprite)

                text_boxes = settings.get('text_boxes', [])
                if text_boxes:
                    canvas = self._draw_text_boxes(canvas, text_boxes)

                output_path = self.output_dir / f"{page_name}.png"
                canvas.convert("RGB").save(output_path)
                print(f"   ✅ Saved: {output_path.name}")
            except Exception as e:
                print(f"   ❌ An unexpected error occurred on '{page_name}': {e}")
                continue
        print("\n" + "="*50 + "\n✅ Composition process complete!\n" + "="*50)

def main():
    config_file = "assets/composition_config.json"
    compositor = StoryCompositor(config_path=config_file)
    compositor.run()

if __name__ == "__main__":
    main()