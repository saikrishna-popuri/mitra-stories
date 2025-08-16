# backend/main.py (Enhanced with Compositor Integration)
import os
import json
import shutil
import subprocess
import sys
from pathlib import Path
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Mitra Storybook Backend")

# --- CORS Middleware ---
origins = ["http://localhost:8080", "http://127.0.0.1:8080"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Static File Serving ---
GENERATED_ASSETS_DIR = os.path.join(os.path.dirname(__file__), 'assets', 'generated_assets')
STORY_FINAL_DIR = os.path.join(os.path.dirname(__file__), 'assets', 'story_final')
os.makedirs(GENERATED_ASSETS_DIR, exist_ok=True)
os.makedirs(STORY_FINAL_DIR, exist_ok=True)

app.mount("/generated", StaticFiles(directory=GENERATED_ASSETS_DIR), name="generated_assets")
app.mount("/stories", StaticFiles(directory=STORY_FINAL_DIR), name="story_pages")

# --- Request Models ---
class StoryComposeRequest(BaseModel):
    story_id: str
    child_name: str
    selected_pose_url: str

@app.post("/generate-avatar", tags=["Avatar"])
async def generate_avatar_endpoint(photo: UploadFile = File(...)):
    """Existing avatar generation endpoint - unchanged"""
    upload_folder = 'temp_uploads'
    os.makedirs(upload_folder, exist_ok=True)
    temp_path = os.path.join(upload_folder, photo.filename)
    
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(photo.file, buffer)
    finally:
        photo.file.close()

    try:
        # Run avatar generator
        command = [
            sys.executable,
            "avatar_generator.py",
            temp_path,
            "avatar_generator.json"
        ]
        
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            check=True,
            cwd=os.path.dirname(__file__)
        )
        
        # Parse output directory
        output_dir_line = next((line for line in result.stdout.splitlines() if 'All assets saved in:' in line), None)
        if not output_dir_line:
            raise HTTPException(status_code=500, detail={
                "error": "Could not determine output directory from script.",
                "stdout": result.stdout,
                "stderr": result.stderr
            })
        
        output_dir = output_dir_line.split('All assets saved in: ')[1].strip()

        # Read generation report
        report_path = os.path.join(output_dir, "generation_report.json")
        if not os.path.exists(report_path):
            raise HTTPException(status_code=500, detail={
                "error": "Generation report not found.",
                "output_dir": output_dir
            })

        with open(report_path, 'r') as f:
            report_data = json.load(f)

        relative_pose_paths = report_data.get("poses", [])
        if not relative_pose_paths:
            raise HTTPException(status_code=500, detail={
                "error": "No poses found in generation report."
            })

        # Convert paths to URLs
        pose_urls = []
        for path in relative_pose_paths:
            url_path = os.path.relpath(path, GENERATED_ASSETS_DIR)
            pose_urls.append(f"/generated/{url_path.replace(os.sep, '/')}")

        return JSONResponse(content={
            "message": "Avatar poses generated successfully!",
            "pose_urls": pose_urls,
            "session_id": Path(output_dir).name  # Return session ID for later use
        })

    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail={
            "error": "The avatar_generator.py script failed.",
            "details": e.stderr
        })
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.post("/compose-story", tags=["Story"])
async def compose_story_endpoint(request: StoryComposeRequest):
    """NEW: Compose story pages using the selected avatar pose"""
    try:
        # Extract session ID from the selected pose URL
        # URL format: /generated/20241201_143022/gpt_split1_pose_0_1.png
        url_parts = request.selected_pose_url.split('/')
        session_id = url_parts[2]  # Extract timestamp directory
        
        # Get the actual file path of the selected pose
        pose_filename = url_parts[-1]  # Get filename
        selected_pose_path = os.path.join(GENERATED_ASSETS_DIR, session_id, pose_filename)
        
        if not os.path.exists(selected_pose_path):
            raise HTTPException(status_code=404, detail=f"Selected pose not found: {selected_pose_path}")
        
        # Create story-specific sprite directory
        sprite_dir = os.path.join(os.path.dirname(__file__), 'assets', 'story_sprites')
        os.makedirs(sprite_dir, exist_ok=True)
        
        # Copy selected pose to sprite directory with story-specific name
        story_sprite_path = os.path.join(sprite_dir, f"{request.story_id}_{request.child_name}_main.png")
        shutil.copy2(selected_pose_path, story_sprite_path)
        
        # Generate composition config based on story
        composition_config = generate_story_config(request.story_id, request.child_name)
        config_path = os.path.join(os.path.dirname(__file__), 'assets', 'composition_config.json')
        
        with open(config_path, 'w') as f:
            json.dump(composition_config, f, indent=2)
        
        # Run compositor
        command = [sys.executable, "compositor.py"]
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            check=True,
            cwd=os.path.dirname(__file__)
        )
        
        # Check for generated story pages
        story_pages = []
        if os.path.exists(STORY_FINAL_DIR):
            for page_file in sorted(os.listdir(STORY_FINAL_DIR)):
                if page_file.endswith('.png'):
                    story_pages.append(f"/stories/{page_file}")
        
        if not story_pages:
            raise HTTPException(status_code=500, detail="No story pages were generated")
        
        return JSONResponse(content={
            "message": "Story composed successfully!",
            "story_pages": story_pages,
            "child_name": request.child_name,
            "story_id": request.story_id
        })
        
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail={
            "error": "Story composition failed",
            "details": e.stderr
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail={
            "error": f"Unexpected error: {str(e)}"
        })

def generate_story_config(story_id: str, child_name: str) -> dict:
    """Generate composition configuration for a specific story"""
    
    # Basic template - you'll expand this based on your stories
    config = {
        "page_1": {
            "template_file": f"{story_id}/page1_background.png",
            "layers": [
                {
                    "filename": f"{story_id}_{child_name}_main.png",
                    "type": "sprite",
                    "position": [400, 300],
                    "scale": 1.0,
                    "enable_layer_shadow": True,
                    "layer_shadow_color": [0, 0, 0],
                    "layer_shadow_offset": [5, 5],
                    "layer_shadow_blur": 5
                }
            ],
            "text_boxes": [
                {
                    "x": 50,
                    "y": 50,
                    "width": 300,
                    "height": 100,
                    "text": f"Hello {child_name}!||Welcome to your adventure!",
                    "font_size": 24,
                    "text_color": [255, 255, 255],
                    "align": "center",
                    "enable_glow": True,
                    "glow_radius": 10,
                    "glow_color": [255, 215, 0]
                }
            ]
        }
    }
    
    return config

@app.get("/health", tags=["System"])
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "Mitra Storybook Backend"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)