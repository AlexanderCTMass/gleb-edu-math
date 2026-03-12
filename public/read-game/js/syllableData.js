// ========== ДАННЫЕ ПЕРСОНАЖЕЙ И СЛОГОВ ==========
// Используем пространство имён, чтобы не конфликтовать с математической игрой
window.SyllableGame = window.SyllableGame || {};

SyllableGame.Characters = [
    { id: 'child', name: 'Ты', fileName: 'child.png' },
    { id: 'father', name: 'Папа', fileName: 'father.png' },
    { id: 'mother', name: 'Мама', fileName: 'mother.png' },
    { id: 'grandfather1', name: 'Дедушка 1', fileName: 'grandfather1.png' },
    { id: 'grandmother1', name: 'Бабушка 1', fileName: 'grandmother2.png' },
    { id: 'grandfather2', name: 'Дедушка 2', fileName: 'grandfather2.png' },
    { id: 'grandmother2', name: 'Бабушка 2', fileName: 'grandmother1.png' },
    { id: 'sister', name: 'Сестренка', fileName: 'sister.png' },
    { id: 'cat_marsel', name: 'Кот Марсель', fileName: 'cat_marsel.png' },
    { id: 'cat_volt', name: 'Кот Вольт', fileName: 'cat_volt.png' },
    { id: 'dog_becky', name: 'Собака Бэкки', fileName: 'dog_becky.png' }
];

SyllableGame.Phrases = [
    // Правильные ответы
    { id: 'child_well_done', characterId: 'child', type: 'correct', fileName: 'child_well_done.mp3' },
    { id: 'father_great', characterId: 'father', type: 'correct', fileName: 'father_great.mp3' },
    { id: 'mother_super', characterId: 'mother', type: 'correct', fileName: 'mother_super.mp3' },
    { id: 'grandfather1_molodets', characterId: 'grandfather1', type: 'correct', fileName: 'grandfather1_molodets.mp3' },
    { id: 'grandmother2_love2', characterId: 'grandmother2', type: 'correct', fileName: 'grandmother2_love.mp3' },
    { id: 'grandmother1_umnitsa', characterId: 'grandmother1', type: 'correct', fileName: 'grandmother1_umnitsa.mp3' },
    { id: 'cat_marsel_mur', characterId: 'cat_marsel', type: 'correct', fileName: 'cat_marsel_mur.mp3' },
    { id: 'cat_volt_myau', characterId: 'cat_volt', type: 'correct', fileName: 'cat_volt_myau.mp3' },
    { id: 'dog_becky_gav', characterId: 'dog_becky', type: 'correct', fileName: 'dog_becky_gav.mp3' },

    // Неправильные ответы
    { id: 'mother_try_again', characterId: 'mother', type: 'incorrect', fileName: 'mother_try_again.mp3' },
    { id: 'father_no_problem', characterId: 'father', type: 'incorrect', fileName: 'father_no_problem.mp3' },
    { id: 'grandmother1_next', characterId: 'grandmother1', type: 'incorrect', fileName: 'grandmother1_next.mp3' },
    { id: 'sister_help', characterId: 'sister', type: 'incorrect', fileName: 'sister_help.mp3' },

    // Случайные подбадривания
    { id: 'grandfather1_pride', characterId: 'grandfather1', type: 'random', fileName: 'grandfather1_pride.mp3' },
    { id: 'grandmother2_love', characterId: 'grandmother2', type: 'random', fileName: 'grandmother2_love.mp3' },
    { id: 'grandmother1_love', characterId: 'grandmother1', type: 'random', fileName: 'grandmother1_love.mp3' },
    { id: 'sister_cool', characterId: 'sister', type: 'random', fileName: 'sister_cool.mp3' }
];

// Для обратной совместимости с кодом, который использует глобальные переменные
window.Characters = SyllableGame.Characters;
window.Phrases = SyllableGame.Phrases;