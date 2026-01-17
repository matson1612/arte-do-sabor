// src/services/uploadService.ts

// 1. Pegue a chave em: https://api.imgbb.com/
const IMGBB_API_KEY = "a1f5d331c0d222dad03a9cca9374bcc4"; // <--- Cole a chave dentro das aspas

export const uploadImage = async (file: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append("image", file);

    // Envia para o ImgBB
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error?.message || "Erro ao fazer upload no ImgBB");
    }

    // Retorna o link da imagem (ex: https://i.ibb.co/...)
    return result.data.url;
  } catch (error) {
    console.error("Erro no upload:", error);
    throw error;
  }
};