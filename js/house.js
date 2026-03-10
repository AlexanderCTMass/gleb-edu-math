// ========== ЛОГИКА ДОМИКА И ПРИМЕРОВ ==========
const HouseManager = (function() {
    // Генерация этажей для числа
    function generateFloors(number) {
        const floors = [];
        for (let i = 1; i < number; i++) {
            floors.push({
                left: i,
                right: number - i,
                userLeft: null,
                userRight: null
            });
        }
        return floors;
    }

    // Проверка, можно ли редактировать ячейку
    function isCellEditable(floorIndex, side, level) {
        if (level === 0 && floorIndex === 0) return false;
        if (level === 1) return side === 'right';
        if (level === 2) return side === 'left';
        if (level === 5) return false;
        if (level === 6) return side === 'left';
        if (level === 7) return side === 'right';
        return true;
    }

    // Отрисовка домика
    function renderHouse(floors, selectedFloorIndex, level) {
        const container = $('#floors-container');
        container.empty();

        floors.forEach((floor, index) => {
            const row = $('<div>').addClass('floor-row');
            if (index === selectedFloorIndex) {
                row.addClass('active-floor');
            }

            // Левая ячейка
            const leftCell = createCell(floor, index, 'left', floor.userLeft, level);

            // Правая ячейка
            const rightCell = createCell(floor, index, 'right', floor.userRight, level);

            row.append(leftCell, rightCell);
            container.append(row);
        });
    }

    function createCell(floor, index, side, value, level) {
        const cell = $('<div>').addClass('floor-cell');

        if (value !== null) {
            cell.text(value).addClass('filled');
        } else {
            cell.text('?').addClass('empty');
        }

        if (!isCellEditable(index, side, level)) {
            cell.addClass('locked');
        }

        cell.attr('data-floor', index);
        cell.attr('data-side', side);
        cell.attr('data-value', value !== null ? value : '');

        return cell;
    }

    // Отображение примера
    function showExample(level, currentNum, floor, selectedFloorIndex) {
        const number = currentNum;
        let leftValue, rightValue, result, unknownPos;

        switch(level) {
            case 5:
                leftValue = floor.left;
                rightValue = floor.right;
                result = '?';
                unknownPos = 'result';
                break;
            case 6:
                leftValue = '?';
                rightValue = floor.right;
                result = number;
                unknownPos = 'left';
                break;
            case 7:
                leftValue = floor.left;
                rightValue = '?';
                result = number;
                unknownPos = 'right';
                break;
            case 8:
                const random = Math.floor(Math.random() * 3);
                if (random === 0) {
                    leftValue = '?';
                    rightValue = floor.right;
                    result = number;
                    unknownPos = 'left';
                } else if (random === 1) {
                    leftValue = floor.left;
                    rightValue = '?';
                    result = number;
                    unknownPos = 'right';
                } else {
                    leftValue = floor.left;
                    rightValue = floor.right;
                    result = '?';
                    unknownPos = 'result';
                }
                break;
        }

        $('#example-left').text(leftValue).removeClass('unknown');
        $('#example-right').text(rightValue).removeClass('unknown');
        $('#example-result').text(result).removeClass('unknown');

        if (unknownPos === 'left') {
            $('#example-left').addClass('unknown').text('?');
        } else if (unknownPos === 'right') {
            $('#example-right').addClass('unknown').text('?');
        } else if (unknownPos === 'result') {
            $('#example-result').addClass('unknown').text('?');
        }

        return unknownPos;
    }

    // Настройка уровня (заполнение начальных значений)
    function setupLevel(level, floors) {
        // Сбрасываем пользовательские значения
        floors.forEach(floor => {
            floor.userLeft = null;
            floor.userRight = null;
        });

        switch(level) {
            case 0:
                floors[0].userLeft = floors[0].left;
                floors[0].userRight = floors[0].right;
                $('#houseContainer').show();
                $('#exampleContainer').hide();
                break;
            case 1:
                floors.forEach(floor => {
                    floor.userLeft = floor.left;
                });
                $('#houseContainer').show();
                $('#exampleContainer').hide();
                break;
            case 2:
                floors.forEach(floor => {
                    floor.userRight = floor.right;
                });
                $('#houseContainer').show();
                $('#exampleContainer').hide();
                break;
            case 3:
                floors.forEach(floor => {
                    if (Math.random() > 0.5) {
                        floor.userLeft = floor.left;
                    } else {
                        floor.userRight = floor.right;
                    }
                });
                $('#houseContainer').show();
                $('#exampleContainer').hide();
                break;
            case 4:
                $('#houseContainer').show();
                $('#exampleContainer').hide();
                break;
            case 5:
            case 6:
            case 7:
            case 8:
                $('#houseContainer').hide();
                $('#exampleContainer').show();
                break;
        }

        return floors;
    }

    return {
        generateFloors,
        renderHouse,
        showExample,
        setupLevel,
        isCellEditable
    };
})();