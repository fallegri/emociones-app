export type EmotionType =
  | "happy"
  | "sad"
  | "angry"
  | "surprised"
  | "disgusted"
  | "fearful"
  | "neutral";

export const emotionLabels: Record<EmotionType, string> = {
  happy: "Feliz",
  sad: "Triste",
  angry: "Enojado/a",
  surprised: "Sorprendido/a",
  disgusted: "Disgustado/a",
  fearful: "Temeroso/a",
  neutral: "Neutral",
};

export const emotionEmojis: Record<EmotionType, string> = {
  happy: "😊",
  sad: "😢",
  angry: "😠",
  surprised: "😲",
  disgusted: "🤢",
  fearful: "😨",
  neutral: "😐",
};

export const emotionColors: Record<EmotionType, string> = {
  happy: "#FFD700",
  sad: "#4169E1",
  angry: "#DC143C",
  surprised: "#FF8C00",
  disgusted: "#228B22",
  fearful: "#8B008B",
  neutral: "#808080",
};

export const emotionMessages: Record<EmotionType, string[]> = {
  happy: [
    "¡Qué alegría ver esas sonrisas! El ambiente está increíble 🎉",
    "¡La felicidad es contagiosa! Sigamos así 😄",
    "¡Excelente energía! Las sonrisas iluminan el lugar ✨",
  ],
  sad: [
    "Parece un momento reflexivo. ¡Un abrazo virtual! 💙",
    "A veces los momentos difíciles nos hacen más fuertes 🌈",
    "Respira profundo, todo mejorará pronto 🕊️",
  ],
  angry: [
    "Detectamos algo de tensión. ¡Tomemos un respiro! 🍃",
    "Un momento para calmarse puede hacer la diferencia 🧘",
    "La calma llega después de la tormenta ⛅",
  ],
  surprised: [
    "¡Wow! Algo impresionante está pasando 🤩",
    "¡Las sorpresas hacen la vida emocionante! 🎊",
    "¡Esa reacción lo dice todo! Momento épico 🌟",
  ],
  disgusted: [
    "Hmm, algo no cuadra. ¡Esperemos que mejore! 🍀",
    "No todo es perfecto, pero siempre hay una solución 💪",
    "Un cambio de perspectiva puede ayudar 🔄",
  ],
  fearful: [
    "Tranquilo/a, estás en un espacio seguro 🛡️",
    "El miedo es normal, pero juntos somos más fuertes 🤝",
    "Respira, todo estará bien 🌸",
  ],
  neutral: [
    "Todo en calma, un momento de serenidad 🧘‍♂️",
    "La tranquilidad también tiene su encanto 🌿",
    "Momento zen detectado. ¡Disfrútalo! ☮️",
  ],
};

export const groupMessages: Record<EmotionType, string[]> = {
  happy: [
    "¡El grupo irradia felicidad! El evento es un éxito 🎉🎊",
    "¡Energía positiva colectiva! Todos están disfrutando 🌟",
  ],
  sad: [
    "El grupo está en un momento reflexivo. ¡Ánimo a todos! 💙",
    "Momento emotivo para el grupo. La unión hace la fuerza 🤝",
  ],
  angry: [
    "Se percibe tensión grupal. ¡Un descanso podría ayudar! 🍃",
    "El grupo necesita un momento de calma 🧘‍♂️",
  ],
  surprised: [
    "¡Todo el grupo está impresionado! ¡Momento memorable! 🤩",
    "¡Sorpresa colectiva! Algo increíble acaba de pasar 🎊",
  ],
  disgusted: [
    "El grupo no parece convencido. ¡Hora de un cambio! 🔄",
    "Señales de inconformidad grupal detectadas 📊",
  ],
  fearful: [
    "El grupo está nervioso. ¡Todo saldrá bien, equipo! 💪",
    "Nerviosismo colectivo detectado. ¡Ánimo! 🛡️",
  ],
  neutral: [
    "El grupo está atento y sereno. Buen momento para interactuar 📋",
    "Ambiente neutral y receptivo en el grupo 🌿",
  ],
};

export function getRandomMessage(emotion: EmotionType, isGroup: boolean): string {
  const messages = isGroup ? groupMessages[emotion] : emotionMessages[emotion];
  return messages[Math.floor(Math.random() * messages.length)];
}

export function getGroupDominantEmotion(emotions: EmotionType[]): EmotionType {
  const frequency: Record<string, number> = {};
  emotions.forEach((e) => {
    frequency[e] = (frequency[e] || 0) + 1;
  });

  let maxCount = 0;
  let dominant: EmotionType = "neutral";
  Object.entries(frequency).forEach(([emotion, count]) => {
    if (count > maxCount) {
      maxCount = count;
      dominant = emotion as EmotionType;
    }
  });

  return dominant;
}
