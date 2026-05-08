"use client";

import { useRef } from "react";
import { Editor } from "@tinymce/tinymce-react";
import {
  uploadMediaToCloudinary,
  createMediaFileInput,
} from "@/lib/cloudinary-media-service";
import { useCalculator } from "./calculator/CalculatorContext";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onImageUpload?: (url: string) => void;
  onVideoUpload?: (url: string) => void;
  isStudentView?: boolean;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  onImageUpload,
  onVideoUpload,
  isStudentView = false,
}: RichTextEditorProps) {
  const editorRef = useRef<any>(null);
  const {
    expression,
    resultDisplay,
    isOpen: isCalculatorOpen,
  } = useCalculator();

  const handleImageUpload = (
    blobInfo: any,
    progress: (percent: number) => void
  ): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      try {
        (window as any).showDialogLoading?.(10);
        progress(10);

        // Convert blob to File object
        const blob = blobInfo.blob();
        const file = new File([blob], blobInfo.filename() || "image", {
          type: blob.type || "image/jpeg",
        });

        (window as any).showDialogLoading?.(30);
        progress(30);

        // Upload to GCS
        const result = await uploadMediaToCloudinary(file);

        (window as any).showDialogLoading?.(90);
        progress(90);

        // Call the callback if provided
        onImageUpload?.(result.url);

        (window as any).showDialogLoading?.(100);
        progress(100);

        setTimeout(() => {
          (window as any).hideDialogLoading?.();
        }, 500);

        resolve(result.url);
      } catch (error) {
        (window as any).hideDialogLoading?.();
        console.error("Image upload failed:", error);
        reject(
          error instanceof Error ? error.message : "Failed to upload image"
        );
      }
    });
  };

  const handleVideoUpload = async (file: File): Promise<string> => {
    try {
      (window as any).showDialogLoading?.(20);

      // Upload to GCS
      const result = await uploadMediaToCloudinary(file);

      (window as any).showDialogLoading?.(90);

      // Call the callback if provided
      onVideoUpload?.(result.url);

      (window as any).showDialogLoading?.(100);

      setTimeout(() => {
        (window as any).hideDialogLoading?.();
      }, 500);

      return result.url;
    } catch (error) {
      (window as any).hideDialogLoading?.();
      console.error("Video upload failed:", error);
      throw error instanceof Error
        ? error
        : new Error("Failed to upload video");
    }
  };

  return (
    <div className="relative border border-slate-300 rounded bg-white overflow-hidden">
      <Editor
        ref={editorRef}
        licenseKey="gpl"
        tinymceScriptSrc="/tinymce/tinymce.min.js"
        value={value}
        onEditorChange={onChange}
        init={{
          height: 300,
          menubar: false,
          statusbar: false,
          branding: false,
          resize: false,
          placeholder: placeholder || "Enter your content here...",
          plugins: [
            "advlist",
            "autolink",
            "lists",
            "link",
            "image",
            "charmap",
            "preview",
            "anchor",
            "searchreplace",
            "visualblocks",
            "code",
            "fullscreen",
            "insertdatetime",
            "media",
            "help",
            "wordcount",
          ],
          extended_valid_elements:
            "iframe[src|width|height|frameborder|allowfullscreen|allow|referrerpolicy|title|class]",
          valid_children: "+body[iframe]",
          toolbar: `${
            isStudentView
              ? "styles | bold italic underline | subscript superscript | bullist numlist | insertcalc | undo redo"
              : "styles | bold italic underline | subscript superscript | bullist numlist | image media | undo redo"
          }`,
          toolbar_mode: "sliding",
          content_style: `
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; 
              font-size: 14px; 
              line-height: 1.6; 
              color: #374151;
              margin: 8px;
            }
            p { margin: 0 0 8px 0; }
            ul, ol { margin: 8px 0; padding-left: 24px; }
            li { margin: 2px 0; }
            img { max-width: 100%; height: auto; }
            video { max-width: 100%; height: auto; }
            table { border-collapse: collapse; width: 100%; max-width: 100%; }
            table td, table th {
              border: 1px solid #d1d5db;
              padding: 6px 8px;
              vertical-align: top;
              word-break: break-word;
            }
            table th {
              background: #f9fafb;
              font-weight: 600;
            }
          `,
          skin: "oxide",
          content_css: "default",
          toolbar_sticky: false,
          contextmenu: false,
          elementpath: false,
          block_formats:
            "Paragraph=p; Heading 1=h1; Heading 2=h2; Heading 3=h3; Heading 4=h4; Heading 5=h5; Heading 6=h6;",
          style_formats: [
            { title: "Normal", format: "p" },
            { title: "Heading 1", format: "h1" },
            { title: "Heading 2", format: "h2" },
            { title: "Heading 3", format: "h3" },
            { title: "Bold", format: "strong" },
            { title: "Italic", format: "em" },
            { title: "Underline", format: "u" },
          ],
          images_upload_handler: onImageUpload ? handleImageUpload : undefined,
          automatic_uploads: true,
          file_picker_types: "image media",
          file_picker_callback: (callback: any, _value: any, meta: any) => {
            if (meta.filetype === "media") {
              createMediaFileInput("video/*", async (file: File) => {
                try {
                  const url = await handleVideoUpload(file);
                  callback(url, { title: file.name });
                } catch (error) {
                  console.error("Video upload error:", error);
                  alert(
                    error instanceof Error
                      ? error.message
                      : "Failed to upload video"
                  );
                }
              });
            } else if (meta.filetype === "image") {
              createMediaFileInput("image/*", async (file: File) => {
                try {
                  (window as any).showDialogLoading?.(20);

                  const result = await uploadMediaToCloudinary(file);

                  (window as any).showDialogLoading?.(90);
                  onImageUpload?.(result.url);
                  callback(result.url, { title: file.name });

                  (window as any).showDialogLoading?.(100);
                  setTimeout(() => {
                    (window as any).hideDialogLoading?.();
                  }, 500);
                } catch (error) {
                  (window as any).hideDialogLoading?.();
                  console.error("Image upload error:", error);
                  alert(
                    error instanceof Error
                      ? error.message
                      : "Failed to upload image"
                  );
                }
              });
            }
          },
          paste_data_images: true,
          image_advtab: true,
          image_caption: true,
          image_description: false,
          image_dimensions: false,
          image_title: true,
          convert_urls: false,
          relative_urls: false,
          remove_script_host: false,
          setup: (editor: any) => {
            // Add custom calculator insert button for student view
            if (isStudentView) {
              editor.ui.registry.addButton("insertcalc", {
                text: "📊",
                tooltip: "Insert Calculator Expression",
                onAction: () => {
                  // Get current state when button is clicked (not from closure)
                  const currentState = useCalculator.getState();

                  if (!currentState.isOpen) {
                    editor.notificationManager.open({
                      text: "Please open the calculator first",
                      type: "warning",
                      timeout: 3000,
                    });
                    return;
                  }

                  // Insert result if available, otherwise insert expression
                  const contentToInsert =
                    currentState.resultDisplay || currentState.expression;

                  if (!contentToInsert) {
                    editor.notificationManager.open({
                      text: "Calculator is empty",
                      type: "warning",
                      timeout: 3000,
                    });
                    return;
                  }

                  // Insert the content at cursor position
                  editor.insertContent(contentToInsert);
                },
              });
            }

            // Function to show loading overlay on TinyMCE dialog
            const showDialogLoading = (progress: number) => {
              const dialog =
                document.querySelector(".tox-dialog-wrap") ||
                document.querySelector(".tox-dialog");
              if (dialog) {
                let overlay = dialog.querySelector(
                  ".upload-loading-overlay"
                ) as HTMLElement;

                if (!overlay) {
                  overlay = document.createElement("div");
                  overlay.className = "upload-loading-overlay";
                  overlay.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(2px);
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                  `;

                  const content = document.createElement("div");
                  content.style.cssText = `
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
                    padding: 2rem;
                    min-width: 300px;
                    text-align: center;
                  `;

                  content.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 1rem;">
                      <div style="
                        width: 24px;
                        height: 24px;
                        border: 2px solid #e5e7eb;
                        border-top: 2px solid #3b82f6;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin-right: 12px;
                      "></div>
                      <span style="font-weight: 500; color: #374151;">Uploading media...</span>
                    </div>
                    <div style="
                      width: 100%;
                      height: 8px;
                      background: #e5e7eb;
                      border-radius: 4px;
                      overflow: hidden;
                      margin-bottom: 0.5rem;
                    ">
                      <div class="progress-bar" style="
                        height: 100%;
                        background: #3b82f6;
                        border-radius: 4px;
                        transition: width 0.3s ease;
                        width: ${progress}%;
                      "></div>
                    </div>
                    <div style="font-size: 12px; color: #6b7280;">${progress}% complete</div>
                  `;

                  overlay.appendChild(content);
                  dialog.appendChild(overlay);

                  // Add CSS animation
                  if (!document.querySelector("#upload-spinner-style")) {
                    const style = document.createElement("style");
                    style.id = "upload-spinner-style";
                    style.textContent = `
                      @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                      }
                    `;
                    document.head.appendChild(style);
                  }
                } else {
                  // Update progress
                  const progressBar = overlay.querySelector(
                    ".progress-bar"
                  ) as HTMLElement;
                  const progressText = overlay.querySelector(
                    "div:last-child"
                  ) as HTMLElement;
                  if (progressBar) progressBar.style.width = `${progress}%`;
                  if (progressText)
                    progressText.textContent = `${progress}% complete`;
                }
              }
            };

            // Function to hide loading overlay
            const hideDialogLoading = () => {
              const overlay = document.querySelector(".upload-loading-overlay");
              if (overlay) {
                overlay.remove();
              }
            };

            // Make functions available globally for the upload handlers
            (window as any).showDialogLoading = showDialogLoading;
            (window as any).hideDialogLoading = hideDialogLoading;

            editor.on("init", () => {
              // Custom styling for the editor container
              const container = editor.getContainer();
              if (container) {
                container.style.border = "none";
              }
            });
          },
        }}
      />
    </div>
  );
}
