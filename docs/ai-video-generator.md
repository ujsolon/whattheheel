# AI Video Generator

# Overview
YouCam AI Video Generator transforms text prompts and images into captivating videos with ease. Powered by advanced AI technology, it creates realistic motion effects that bring your ideas and photos to life. With a wide selection of professionally optimized templates, you can quickly turn still images into engaging, high quality video content.

To create an AI video from an image, start with a photo that features a clean background and a clearly visible portrait. Simply upload your image and let YouCam AI Video Generator do the rest, transforming your text prompts and photo into a dynamic video in just moments.

Use cases:

![](https://bcw-media.s3.ap-northeast-1.amazonaws.com/strapi/assets/webp_Animate%20Photo_047_d9e1cff579.jpg)

![](https://bcw-media.s3.ap-northeast-1.amazonaws.com/AI_Dance_Video_61cf4c58d1.png)

![](https://bcw-media.s3.ap-northeast-1.amazonaws.com/241216_AI_Kiss_image05_c3b7f1ac5b.jpg)


## File Specs & Errors

* Supported Formats & Dimensions

|AI Feature|Supported Dimensions|Supported File Size|Supported Formats|
|  ----  | ----  | ----  | ----  |
| V1.0 Image to Video (Standard) |Input: >= 300*300px with aspect ratio between 1:2.5 ~ 2.5:1. Output: Up to 720p 30fps|Input: <10MB. Output: 5 seconds or 10 seconds|jpg/jpeg/png|
| V1.0 Image to Video (Professional) |Input: >= 300*300px with aspect ratio between 1:2.5 ~ 2.5:1. Output: Up to 1080p 30fps|Input: <10MB. Output: 5 seconds or 10 seconds|jpg/jpeg/png|
| V2.0 Image to Video | Input images must have a long side no greater than 4096 pixels and an aspect ratio between 1:2.5 and 2.5:1. <br> Supported output resolutions are 480p, 720p, and 1080p. If the input image’s short side exceeds the selected resolution, or if its long side is smaller than the target, the image will be automatically resized so that the short side matches the chosen resolution. |Input: <10MB. Output: 5 seconds or 10 seconds|jpg/jpeg/png|

* Error Codes

| Error Category | Scenario / Description | Suggested Action |
| -------------- | ---------------------- | ---------------- |
| Invalid request parameters | Request parameters are invalid or missing | Verify that all request parameters are correct |
| | Invalid parameter values (e.g., incorrect key or illegal value) | Check the error message field in the response and update the request parameters |
| | Invalid request method | Review the API documentation and use the correct HTTP method |
| | Requested resource does not exist (e.g., model not found) | Refer to the response error message field and correct the request parameters|
| Trigger strategy | Platform policy has been triggered | Check whether any platform policies were violated |
| | Content security policy triggered  | Review and modify the input content, then resend the request |
| | Request rate too high (rate limit exceeded)| Reduce request frequency, retry later, or contact customer service to increase limits |
| | Concurrency or QPS exceeds quota   | Reduce request frequency, or retry later |
| Internal error  | Internal server error | Retry later or contact customer service |
| | Server temporarily unavailable | Retry later or contact customer service |
| | Internal timeout due to request backlog| Retry later or contact customer service |


License: Privacy policy

## Servers

```
https://yce-api-01.makeupar.com
```

## Security

### BearerAuthenticationV2

Use the standard 'Bearer authentication'. Put your 'API Key' in header: `Authorization:Bearer YOUR_API_KEY`. Notice that there is ' ' a space between 'Bearer' and the 'YOUR_API_KEY'.

Type: http
Scheme: bearer

## Download OpenAPI description

[AI Video Generator](https://docs.perfectcorp.com/_bundle/reference/ai_video_generator.yaml)

## V2.0

Bring your photos to life with AI Image to Video Generation. Upload an image and provide a description, and the system instantly converts it into motion filled visuals powered by advanced AI technology. It is the easiest way to enjoy high quality image to video generation without learning any editing tools.

### Run an AI Image to Video Generator V2 task.

 - [POST /s2s/v2.0/task/image-to-video/youcam](https://docs.perfectcorp.com/reference/ai_video_generator/v2.0/paths/~1s2s~1v2.0~1task~1image-to-video~1youcam/post.md): AI tasks are asynchronous. Prefer webhook-based completion handling when the feature supports webhooks. Configure your webhook endpoint, verify webhook signatures, and use the received task_id to query the task result after a success or error notification. See the webhook integration guide for setup and verification details.

If webhooks are not supported for the feature, or if your integration cannot use webhooks, implement polling. After starting an AI task, keep polling the task status endpoint at the given polling_interval until the task status is either success or error.

Do not stop polling a running task for longer than the allowed polling window. If the task is not polled in time, the task may expire; a later status check can return InvalidTaskId even if processing finished, and the consumed units may still be charged.

### Check the status of a AI Image to Video Generator V2 task.

 - [GET /s2s/v2.0/task/image-to-video/youcam/{task_id}](https://docs.perfectcorp.com/reference/ai_video_generator/v2.0/paths/~1s2s~1v2.0~1task~1image-to-video~1youcam~1%7Btask_id%7D/get.md)

### Run an AI Text To Video task.

 - [POST /s2s/v2.0/task/text-to-video/youcam](https://docs.perfectcorp.com/reference/ai_video_generator/v2.0/paths/~1s2s~1v2.0~1task~1text-to-video~1youcam/post.md): AI tasks are asynchronous. Prefer webhook-based completion handling when the feature supports webhooks. Configure your webhook endpoint, verify webhook signatures, and use the received task_id to query the task result after a success or error notification. See the webhook integration guide for setup and verification details.

If webhooks are not supported for the feature, or if your integration cannot use webhooks, implement polling. After starting an AI task, keep polling the task status endpoint at the given polling_interval until the task status is either success or error.

Do not stop polling a running task for longer than the allowed polling window. If the task is not polled in time, the task may expire; a later status check can return InvalidTaskId even if processing finished, and the consumed units may still be charged.

### Check the status of a AI Text To Video task.

 - [GET /s2s/v2.0/task/text-to-video/youcam/{task_id}](https://docs.perfectcorp.com/reference/ai_video_generator/v2.0/paths/~1s2s~1v2.0~1task~1text-to-video~1youcam~1%7Btask_id%7D/get.md)

## V1.0

With AI Image to Video Generation, you can upload a single photo and watch it come alive with motion and personality. Advanced artificial intelligence transforms your image into dynamic visuals, allowing you to create stunning videos without any video editing experience. Enjoy the best in AI powered image to video creation.

### List predefined templates.

 - [GET /s2s/v2.0/task/template/image-to-video](https://docs.perfectcorp.com/reference/ai_video_generator/v1.0/paths/~1s2s~1v2.0~1task~1template~1image-to-video/get.md)

### Run an Image to Video task.

 - [POST /s2s/v2.0/task/image-to-video](https://docs.perfectcorp.com/reference/ai_video_generator/v1.0/paths/~1s2s~1v2.0~1task~1image-to-video/post.md): This endpoint initiates the image to video conversion process. You must provide a template ID and source file (via URL or File ID). The task will be processed asynchronously, and you can check its status using the task_id returned in this response.

### Check the status of the Image to Video task.

 - [GET /s2s/v2.0/task/image-to-video/{task_id}](https://docs.perfectcorp.com/reference/ai_video_generator/v1.0/paths/~1s2s~1v2.0~1task~1image-to-video~1%7Btask_id%7D/get.md)
