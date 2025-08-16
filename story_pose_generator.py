# story_pose_generator.py
"""
Story Pose Generator with Automatic Sprite Processing

This script generates avatar poses using OpenAI's GPT model and automatically
processes them into clean, cropped sprites ready for composition.

Features:
- Generates avatars based on prompts from story_pose_prompts.json
- Automatically splits sprite sheets into individual sprites
- Advanced white background removal with edge decontamination
- Preserves fine details like hair while removing halos
- Crops excess alpha to create "die-cut sticker" style sprites
- Outputs clean, individual sprites ready for story composition
- Generates image_dimensions.json with all sprite dimensions
"""

import os
import json
import time
from pathlib import Path
from datetime import datetime
import openai
from dotenv import load_dotenv
import base64
from PIL import Image
import numpy as np
import cv2
import requests
import sys

class StoryPoseGenerator:
    """
    Generates and processes avatar poses for story composition.
    """
    def __init__(self, config_path: str = "story_pose_prompts.json"):
        """
        Initializes the generator and loads configuration.
        
        Args:
            config_path (str): Path to the JSON file containing prompts and parameters.
        """
        load_dotenv()
        
        # Initialize OpenAI client
        self.openai_client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        if not os.getenv("OPENAI_API_KEY"):
            sys.exit("❌ Error: OPENAI_API_KEY not found in .env file.")
        
        self.config = self._load_config(config_path)
        
        # Create output directory for processed sprites
        self.output_dir = Path("assets/story_sprites") / datetime.now().strftime("%Y%m%d_%H%M%S")
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Track generated poses for summary
        self.generated_poses = []

    def _load_config(self, config_path: str) -> dict:
        """Loads configuration from the specified JSON file."""
        config_path_obj = Path(config_path)
        if not config_path_obj.exists():
            sys.exit(f"❌ Error: Config file not found at '{config_path}'.")
        try:
            with open(config_path_obj, 'r', encoding='utf-8') as f:
                print(f"✅ Successfully loaded config from {config_path_obj.name}")
                return json.load(f)
        except json.JSONDecodeError:
            sys.exit(f"❌ Error: Could not decode JSON from '{config_path}'.")

    def _save_openai_image(self, response, path: Path):
        """Helper to save image from OpenAI API response."""
        try:
            if response.data[0].b64_json:
                img_bytes = base64.b64decode(response.data[0].b64_json)
            elif response.data[0].url:
                img_data = requests.get(response.data[0].url, timeout=30).content
                img_bytes = img_data
            else:
                raise Exception("No valid image data in OpenAI response")
            with open(path, 'wb') as f:
                f.write(img_bytes)
        except Exception as e:
            raise Exception(f"Failed to save OpenAI image: {e}")

    def decontaminate_edges(self, rgb_array, alpha_channel):
        """
        Remove white color bleeding from semi-transparent edges.
        This restores the original colors that got mixed with white background.
        
        Args:
            rgb_array: RGB channels as float32 array
            alpha_channel: Alpha channel as float32 array (0-1 range)
        
        Returns:
            Decontaminated RGB array
        """
        # Find semi-transparent pixels (these are the edge pixels)
        semi_transparent_mask = (alpha_channel > 0.1) & (alpha_channel < 0.95)
        
        if np.any(semi_transparent_mask):
            # For each color channel, restore the original color
            # Formula: original = (observed - white * (1 - alpha)) / alpha
            # This reverses the blend: observed = original * alpha + white * (1 - alpha)
            
            for c in range(3):
                channel = rgb_array[:, :, c].copy()
                
                # Remove white contamination from semi-transparent pixels
                original_color = np.where(
                    semi_transparent_mask,
                    np.clip(
                        (channel - 255 * (1 - alpha_channel)) / np.maximum(alpha_channel, 0.01),
                        0, 
                        255
                    ),
                    channel
                )
                rgb_array[:, :, c] = original_color
        
        return rgb_array

    def remove_white_background(self, image_array):
        """
        Advanced white background removal with edge decontamination.
        Uses graduated alpha for smooth edges and color restoration for hair quality.
        
        Args:
            image_array: RGBA numpy array
        
        Returns:
            RGBA array with white background converted to transparent
        """
        h, w = image_array.shape[:2]
        
        # Check if already has transparent background
        if image_array.shape[2] == 4:
            alpha = image_array[:, :, 3]
            # If alpha channel has significant transparency, skip processing
            if np.mean(alpha) < 240:
                return image_array
        
        # Convert to RGB for processing
        rgb = image_array[:, :, :3].copy()
        
        # Step 1: Find definite background (very white pixels)
        # Use a high threshold to be sure these are background
        core_white_threshold = 245
        gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
        core_white_mask = (gray >= core_white_threshold).astype(np.uint8) * 255
        
        # Step 2: Flood fill from corners to find connected background
        flood_mask = np.zeros((h + 2, w + 2), np.uint8)
        flood_image = core_white_mask.copy()
        
        # Check corners and flood fill white areas connected to edges
        corners = [(0, 0), (w-1, 0), (0, h-1), (w-1, h-1)]
        for corner in corners:
            if core_white_mask[corner[1], corner[0]] > 240:
                cv2.floodFill(flood_image, flood_mask, corner, 128)
        
        # Create background mask from flood-filled areas
        definite_background = (flood_image == 128).astype(np.uint8)
        
        # Step 3: Expand the background mask to catch anti-aliased edges
        # This catches the "fuzzy" pixels around the character
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        expanded_background = cv2.dilate(definite_background, kernel, iterations=2)
        
        # Step 4: Create graduated alpha based on color similarity to white
        # This handles the transition zone smoothly
        alpha_channel = np.ones((h, w), dtype=np.float32)
        
        # Definite background gets full transparency
        alpha_channel[definite_background == 1] = 0
        
        # For expansion zone, calculate alpha based on whiteness
        expansion_zone = (expanded_background == 1) & (definite_background == 0)
        
        if np.any(expansion_zone):
            # For pixels in expansion zone, create gradient based on brightness
            zone_coords = np.where(expansion_zone)
            for y, x in zip(zone_coords[0], zone_coords[1]):
                pixel_gray = gray[y, x]
                
                if pixel_gray > 230:  # Light pixels (likely background remnants)
                    # Map 230-255 to alpha 255-0 (lighter = more transparent)
                    alpha_val = max(0, 255 - ((pixel_gray - 230) / 25 * 255))
                    alpha_channel[y, x] = alpha_val / 255.0
                elif pixel_gray > 200:  # Medium-light pixels
                    # Partial transparency for transition
                    alpha_val = min(255, (230 - pixel_gray) / 30 * 128 + 127)
                    alpha_channel[y, x] = alpha_val / 255.0
        
        # Step 5: Apply Gaussian blur for smooth transitions
        # Smaller kernel for less blurring, preserving hair details
        alpha_channel = cv2.GaussianBlur(alpha_channel, (3, 3), 0.8)
        
        # Step 6: Color decontamination
        # This is crucial for hair quality - removes white mixing from edges
        rgb_float = rgb.astype(np.float32)
        rgb_decontaminated = self.decontaminate_edges(rgb_float, alpha_channel)
        
        # Step 7: Refine alpha channel to ensure no harsh edges
        # Apply slight morphological operations to clean up
        alpha_uint8 = (alpha_channel * 255).astype(np.uint8)
        
        # Remove small holes in the alpha (keeps character solid)
        kernel_small = np.ones((2, 2), np.uint8)
        alpha_uint8 = cv2.morphologyEx(alpha_uint8, cv2.MORPH_CLOSE, kernel_small)
        
        # Final smooth to ensure no harsh transitions
        alpha_uint8 = cv2.GaussianBlur(alpha_uint8, (3, 3), 0.5)
        
        # Step 8: Combine into final RGBA image
        if image_array.shape[2] == 3:
            image_array = np.dstack([
                rgb_decontaminated.astype(np.uint8),
                alpha_uint8
            ])
        else:
            image_array[:, :, :3] = rgb_decontaminated.astype(np.uint8)
            image_array[:, :, 3] = alpha_uint8
        
        return image_array

    def crop_sprite_tight(self, image_array):
        """
        Crop a sprite tightly based on its alpha channel to create a "die-cut sticker" effect.
        First removes white background if present, then crops.
        
        Args:
            image_array: RGBA numpy array
        
        Returns:
            Cropped RGBA image array
        """
        # First remove white background if present
        image_array = self.remove_white_background(image_array)
        
        if image_array.shape[2] == 4:
            alpha = image_array[:, :, 3]
            
            # Find actual content bounds
            rows = np.any(alpha > 10, axis=1)
            cols = np.any(alpha > 10, axis=0)
            
            if np.any(rows) and np.any(cols):
                rmin, rmax = np.where(rows)[0][[0, -1]]
                cmin, cmax = np.where(cols)[0][[0, -1]]
                
                # Add minimal padding (2px) for safety
                padding = 2
                rmin = max(0, rmin - padding)
                rmax = min(image_array.shape[0] - 1, rmax + padding)
                cmin = max(0, cmin - padding)
                cmax = min(image_array.shape[1] - 1, cmax + padding)
                
                return image_array[rmin:rmax+1, cmin:cmax+1]
        
        return image_array

    def find_sprites_in_sheet(self, image_array, min_area=500):
        """
        Find individual sprites in a sprite sheet by detecting connected components.
        
        Args:
            image_array: RGBA numpy array
            min_area: Minimum area for a valid sprite
        
        Returns:
            List of bounding boxes (x, y, width, height) for each sprite
        """
        # First remove white background if present
        processed_array = self.remove_white_background(image_array.copy())
        
        # Create binary mask from alpha channel
        if processed_array.shape[2] == 4:
            alpha = processed_array[:, :, 3]
        else:
            gray = cv2.cvtColor(processed_array[:, :, :3], cv2.COLOR_RGB2GRAY)
            alpha = np.where(gray < 250, 255, 0).astype(np.uint8)
        
        # Threshold to create binary image
        _, binary = cv2.threshold(alpha, 10, 255, cv2.THRESH_BINARY)
        
        # Find connected components
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(binary, connectivity=8)
        
        sprites = []
        for i in range(1, num_labels):  # Skip background (label 0)
            x, y, w, h, area = stats[i]
            
            if area >= min_area:
                sprites.append((x, y, w, h))
        
        # Sort sprites by x-coordinate (left to right)
        sprites.sort(key=lambda box: box[0])
        
        return sprites

    def process_sprite_sheet(self, image_path: Path) -> list:
        """
        Process a sprite sheet: detect, split, and crop individual sprites.
        
        Args:
            image_path: Path to the sprite sheet image
        
        Returns:
            List of cropped sprite images
        """
        # Load image
        image = Image.open(image_path).convert("RGBA")
        image_array = np.array(image)
        
        # Find sprites in the sheet (background removal happens inside)
        sprites = self.find_sprites_in_sheet(image_array)
        
        cropped_sprites = []
        for bbox in sprites:
            # Extract sprite region
            x, y, w, h = bbox
            sprite_region = image_array[y:y+h, x:x+w].copy()
            
            # Crop tight to remove excess alpha (includes background removal)
            cropped = self.crop_sprite_tight(sprite_region)
            cropped_sprites.append(Image.fromarray(cropped))
        
        return cropped_sprites

    def process_single_sprite(self, image_path: Path) -> Image.Image:
        """
        Process a single sprite image: remove white background and crop excess alpha.
        
        Args:
            image_path: Path to the sprite image
        
        Returns:
            Cropped sprite image
        """
        # Load image
        image = Image.open(image_path).convert("RGBA")
        image_array = np.array(image)
        
        # Remove white background and crop tight
        cropped = self.crop_sprite_tight(image_array)
        
        return Image.fromarray(cropped)

    def generate_and_process_pose(self, child_photo_path: str, task_name: str, task_config: dict, pose_number: int) -> list:
        """
        Generate a pose and process it into clean sprites.
        
        Args:
            child_photo_path: Path to the reference photo
            task_name: Name of the task (e.g., "split1")
            task_config: Configuration containing prompt and params
            pose_number: Starting pose number for naming
        
        Returns:
            List of paths to generated sprite files
        """
        start_time = time.time()
        temp_path = self.output_dir / f"temp_{task_name}.png"
        generated_sprites = []
        
        try:
            # Generate image using OpenAI API
            with open(child_photo_path, "rb") as image_file:
                response = self.openai_client.images.edit(
                    model="gpt-image-1",
                    image=image_file,
                    prompt=task_config['prompt'],
                    **task_config['params']
                )
            
            # Save temporary image
            self._save_openai_image(response, temp_path)
            
            # Check if it's a sprite sheet or single image
            size = task_config['params'].get('size', '1024x1024')
            
            if size == "1536x1024":
                # Process sprite sheet
                print(f"   📋 Processing sprite sheet ({size})")
                sprites = self.process_sprite_sheet(temp_path)
                
                for i, sprite in enumerate(sprites):
                    sprite_path = self.output_dir / f"pose_{pose_number + i}.png"
                    sprite.save(sprite_path, "PNG")
                    generated_sprites.append(str(sprite_path))
                    print(f"   ✂️ Saved cropped sprite: pose_{pose_number + i}.png (size: {sprite.size})")
                
            else:  # 1024x1024 or other single images
                # Process single sprite
                print(f"   🖼️ Processing single sprite ({size})")
                sprite = self.process_single_sprite(temp_path)
                
                sprite_path = self.output_dir / f"pose_{pose_number}.png"
                sprite.save(sprite_path, "PNG")
                generated_sprites.append(str(sprite_path))
                print(f"   ✂️ Saved cropped sprite: pose_{pose_number}.png (size: {sprite.size})")
            
            # Clean up temporary file
            temp_path.unlink()
            
            generation_time = time.time() - start_time
            print(f"   ⏱️ Processing time: {generation_time:.1f}s")
            
            return generated_sprites
            
        except Exception as e:
            print(f"❌ Failed to generate/process {task_name}: {e}")
            if temp_path.exists():
                temp_path.unlink()
            return []

    def generate_image_dimensions_json(self):
        """
        Generate a JSON file containing dimensions of all generated sprites.
        Format: {"filename": "width x height"}
        """
        dimensions_dict = {}
        
        # Common image extensions to look for
        image_extensions = ('.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.webp', '.ico')
        
        print("\n📐 Generating image dimensions JSON...")
        
        # Scan output directory for all images
        for file_path in self.output_dir.iterdir():
            if file_path.suffix.lower() in image_extensions:
                try:
                    # Open image and get dimensions
                    with Image.open(file_path) as img:
                        width, height = img.size
                        dimensions_dict[file_path.name] = f"{width} x {height}"
                        print(f"   📏 {file_path.name}: {width} x {height}")
                except Exception as e:
                    print(f"   ⚠️ Error reading {file_path.name}: {e}")
        
        # Save dimensions to JSON file
        if dimensions_dict:
            json_path = self.output_dir / "image_dimensions.json"
            with open(json_path, 'w') as f:
                json.dump(dimensions_dict, f, indent=2)
            print(f"✅ Dimensions JSON saved: {json_path.name}")
            print(f"   Total images measured: {len(dimensions_dict)}")
        else:
            print("⚠️ No images found to measure")
        
        return dimensions_dict

    def run(self, child_photo_path: str):
        """
        Execute the full generation pipeline for all poses.
        Total: 17 individual poses from 10 tasks
        - 3 single images (1024x1024): split1, split2, split10
        - 7 sprite sheets (1536x1024): split3-split9, each produces 2 sprites
        
        Args:
            child_photo_path: Path to the child's reference photo
        """
        print("\n" + "="*70)
        print(f"🚀 Starting Story Pose Generation")
        print(f"👶 Input Photo: {Path(child_photo_path).name}")
        print(f"📁 Output to: {self.output_dir}")
        print("="*70 + "\n")
        
        # Get GPT tasks from config
        try:
            tasks = self.config['gpt']
        except KeyError:
            sys.exit("❌ Error: 'gpt' configuration not found in config file.")
        
        pose_counter = 1
        total_time = 0
        
        # Process each task
        for i, (task_name, task_config) in enumerate(tasks.items()):
            print(f"🎨 Task {i+1}/{len(tasks)}: Generating '{task_name}'...")
            
            start_time = time.time()
            sprites = self.generate_and_process_pose(
                child_photo_path,
                task_name,
                task_config,
                pose_counter
            )
            
            if sprites:
                self.generated_poses.extend(sprites)
                # Update pose counter based on number of sprites generated
                pose_counter += len(sprites)
            
            task_time = time.time() - start_time
            total_time += task_time
            
            # Small delay between API calls
            if i < len(tasks) - 1:
                time.sleep(1)
        
        # Generate image dimensions JSON
        dimensions = self.generate_image_dimensions_json()
        
        # Generate summary report (now includes dimensions)
        self._generate_summary(child_photo_path, total_time, dimensions)
        
        print("\n" + "="*70)
        print("✅ Pose generation complete!")
        print(f"📁 {len(self.generated_poses)} sprites saved in: {self.output_dir}")
        print(f"📊 Image dimensions saved in: image_dimensions.json")
        print("="*70 + "\n")

    def _generate_summary(self, child_photo_path: str, total_time: float, dimensions: dict = None):
        """Generate a JSON summary of the generation process."""
        summary = {
            "generation_timestamp": datetime.now().isoformat(),
            "input_photo": child_photo_path,
            "output_directory": str(self.output_dir),
            "total_generation_seconds": round(total_time, 2),
            "total_sprites_generated": len(self.generated_poses),
            "sprites": [Path(p).name for p in self.generated_poses],
            "sprite_dimensions": dimensions if dimensions else {}
        }
        
        summary_path = self.output_dir / "generation_summary.json"
        with open(summary_path, 'w') as f:
            json.dump(summary, f, indent=4)
        print(f"📊 Summary saved: {summary_path.name}")


def select_test_photo() -> str | None:
    """Scans a directory for test photos and prompts the user to select one."""
    test_photos_dir = Path("assets/test_user_photos")
    if not test_photos_dir.exists():
        print(f"❌ Test photo directory not found at '{test_photos_dir}'")
        return None
    
    image_files = sorted(
        list(test_photos_dir.glob("*.jpg")) + 
        list(test_photos_dir.glob("*.jpeg")) + 
        list(test_photos_dir.glob("*.png"))
    )
    
    if not image_files:
        print(f"❌ No image files found in '{test_photos_dir}'")
        return None
    
    print("\nPlease select a photo to process:")
    for idx, photo in enumerate(image_files, 1):
        print(f"  {idx}. {photo.name}")
    
    while True:
        try:
            choice = int(input(f"Enter your choice (1-{len(image_files)}): "))
            if 1 <= choice <= len(image_files):
                return str(image_files[choice - 1])
            else:
                print("Invalid choice. Please try again.")
        except ValueError:
            print("Invalid input. Please enter a number.")


def main():
    """Main entry point for the script."""
    # Check for command line argument or interactive selection
    if len(sys.argv) > 1:
        child_photo = sys.argv[1]
        if not Path(child_photo).exists():
            print(f"❌ Error: Photo not found at '{child_photo}'")
            sys.exit(1)
    else:
        # Interactive photo selection
        child_photo = select_test_photo()
        if not child_photo:
            sys.exit(1)
    
    # Run the generator
    generator = StoryPoseGenerator(config_path="story_pose_prompts.json")
    generator.run(child_photo_path=child_photo)


if __name__ == "__main__":
    main()