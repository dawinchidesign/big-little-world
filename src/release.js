import { T } from "./content.js";
export const VERSION = "1.6.0";
export const RELEASE_UI = {
  bootFail: T(
    "Не удалось подготовить мир. Проверьте, что архив распакован целиком. Сохранения не удалены.",
    "Әлемді дайындау мүмкін болмады. Мұрағаттың толық ашылғанын тексеріңіз. Сақтаулар жойылған жоқ.",
    "The world could not load. Make sure the whole archive is extracted. Your saves have not been deleted.",
  ),
  retry: T("Попробовать снова", "Қайта көру", "Try again"),
  loading: T("Подготовка мира…", "Әлем дайындалуда…", "Preparing the world…"),
  rotate: T(
    "Для широкого обзора поверните устройство",
    "Кеңірек көру үшін құрылғыны бұрыңыз",
    "Rotate your device for a wider view",
  ),
  motion: T(
    "Уменьшить движение эффектов",
    "Әсерлер қозғалысын азайту",
    "Reduce effect motion",
  ),
};
