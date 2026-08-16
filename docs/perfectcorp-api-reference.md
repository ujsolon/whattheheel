# Perfect Corp API Reference - AI Shoes Virtual Try-On

## Overview
AI Shoes Virtual Try-On technology allows users to instantly see how styles look and fit using AR.

## Integration Guide
**Endpoint:** `/s2s/v2.0/task/shoes`
**Authentication:** All requests require an `Authorization: Bearer YOUR_API_KEY` header.

### Workflow:
1.  **Prepare Selfie:** Upload selfie (head-to-chest) via File API or URL.
2.  **Prepare Shoes Image:** Upload shoe product image or photo of person wearing shoes via File API or URL.
3.  **Select Style/Gender:** Choose preference for visualization.
4.  **Fire AI Task:** Use AI Task API (`/s2s/v2.0/task/shoes`) to get `task_id`.
5.  **Poll Status:** Use `task_id` with GET request to check status until `success` or `error`.

---

## AI Shoes API Usage Guide

### Step 1: Prepare Selfie Image
Use File API (`/s2s/v2.0/file`) to upload a target user image.

**Image Requirements:**
- Selfie photo.
- Clearly shows upper body.
- Avoid backgrounds with multiple people or distracting objects.

### Step 2: Prepare Reference Shoes Image
Use File API or URL.
- **Product Image:** Min 512x512, >25% height.
- **Worn Image:** Min 800x800, >20% height, single item.

### Step 3: Create AI Task
POST request to `/s2s/v2.0/task/shoes`.

**Parameters:**
- `src_file_url` or `src_file_id` (User image)
- `ref_file_url` or `ref_file_id` (Shoes image)
- `gender`: e.g., "female"
- `style`: "random" or predefined styles: "style_minimalist", "style_bohemian", "style_cottagecore", "style_french_elegance", "style_retro_fashion"

---

## File Specs & Errors

| Feature | Min Resolution | Max File Size | Supported Formats |
| :--- | :--- | :--- | :--- |
| **Selfie** | 512x512 | < 10MB | jpg/jpeg/png/heic |
| **Shoes (Product)**| 512x512 | < 10MB | jpg/jpeg/png/heic |
| **Shoes (Worn)** | 800x800 | < 10MB | jpg/jpeg/png/heic |

**Selfie View Requirements:**
- Recommended: 512x512 resolution.
- Recommended: >15% face coverage of image height.
- Single subject requirement.
- Face fully visible without obstruction.
- Framing: Top of head to chest preferred; half-body (head to waist) optimal.

**Error Codes:**
- `error_download_image`: Failed to download images.
- `error_inference`: Inference pipeline error.
- `error_no_face`: No face detected in selfie.
- `error_nsfw_content_detected`: NSFW content detected.
- `exceed_max_filesize`: File > 10MB.
- `invalid_parameter`: Invalid gender or style value.
