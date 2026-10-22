# Используемые репозитории

Проверены через подключённый GitHub. Пакеты установлены и входят в bundle; это не список формальных ссылок.

| Репозиторий | Версия | Реальное применение |
|---|---|---|
| https://github.com/phaserjs/phaser | 3.90.0 | Сцены, Canvas/WebGL, спрайты, загрузка текстур, Arcade Physics, камера, ввод |
| https://github.com/greensock/GSAP | 3.13.0 | Пролёты, изменение масштаба, кат-сцены, частицы, переходы интерфейса |
| https://github.com/i18next/i18next | 25.6.0 | Переключение языка интерфейса без перезапуска |
| https://github.com/goldfire/howler.js | 2.2.4 | Звук, музыкальные темы, отдельная громкость, fade и rate |
| https://github.com/vitejs/vite | 7.1.9 | Сборка, dev-сервер, упаковка локальных зависимостей |
| https://github.com/soimy/maxrects-packer | 3.0.0 | Реальная упаковка кадров в атласы до 1024 px в scripts/build-visual-assets.mjs; только инструмент сборки |
| https://github.com/jwagner/simplex-noise.js | 4.0.3 | Связная фактура грунта и плавные порывы ветра, общие для соседних растений на суше и под водой |

Phaser закреплён на ветке 3 согласно заданию. Обновление на Phaser 4 требует отдельной миграции. Версии записаны в package-lock.json.

Оба новых инструмента проверены по README и LICENSE через подключённый GitHub. MIT-лицензии включены в LICENSES. MaxRects Packer и инструменты проверки — Node test runner, fake-indexeddb, JSDOM, @napi-rs/canvas — не входят в клиентскую игру.
