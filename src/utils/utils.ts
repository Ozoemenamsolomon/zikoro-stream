import { nanoid } from "nanoid";

export function calculateAndSetWindowHeight(
    divRef: React.RefObject<HTMLDivElement>, ded: number = 100
  ) {
    const div = divRef.current;
  
    if (div) {
      
  
      
      div.style.height = `${window.innerHeight -ded}px`;
    }
  }
   
  
 
  export function generateAlias(): string {
    const alias = nanoid().replace(/[-_]/g, "").substring(0, 20);
  
    return alias;
  }
 

  
  export async function uploadFile(file: File | string, type: string) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("cloud_name", "zikoro");
    formData.append("upload_preset", "w5xbik6z");
    formData.append("folder", "ZIKORO");
    if (type === "video") {
      formData.append("resource_type", "video");
    } else if (type === "pdf") {
      formData.append("resource_type", "raw");
    
    } 
    else if (type === "audio") {  
      formData.append("resource_type", "audio");
    }
    else {
      formData.append("resource_type", "image");
    }
  
    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/zikoro/${
          type === "pdf" ? "raw" : type
        }/upload`,
        {
          method: "POST",
          body: formData,
        }
      );
  
      if (response.ok) {
        const data = await response.json();
  
        return data.secure_url;
      } else {
        console.error("Failed to upload image");
        return null;
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      return null;
    }
  }