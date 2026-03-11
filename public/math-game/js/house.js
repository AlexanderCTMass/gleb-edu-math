// ========== ЛОГИКА ДОМИКА И ПРИМЕРОВ ==========
const HouseManager = (function() {
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

    function isCellEditable(floorIndex, side, level) {
        if (level === 0) return false; // На уровне 0 ничего нельзя редактировать
        if (level === 1) return side === 'right';
        if (level === 2) return side === 'left';
        if (level === 3) return side === 'left'; // Только левое редактируется
        if (level === 4) return side === 'right'; // Только правое редактируется
        if (level === 5) return false; // Для примеров не через клетки
        if (level === 6) return false;
        if (level === 7) return false;
        return true;
    }

    function renderHouse(floors, selectedFloorIndex, level, unknownSide) {
        const container = $('#floors-container');
        container.empty();

        floors.forEach((floor, index) => {
            const row = $('<div>').addClass('floor-row');
            if (index === selectedFloorIndex) {
                row.addClass('active-floor');
            }

            // Для уровня 0 показываем все числа
            if (level === 0) {
                floor.userLeft = floor.left;
                floor.userRight = floor.right;
            }

            const leftCell = createCell(floor, index, 'left', floor.userLeft, level);
            const rightCell = createCell(floor, index, 'right', floor.userRight, level);

            // Подсвечиваем неизвестное только для активного этажа и не на уровне 0
            if (index === selectedFloorIndex && level > 0) {
                if (unknownSide === 'left' && floor.userLeft === null) {
                    leftCell.addClass('unknown');
                } else if (unknownSide === 'right' && floor.userRight === null) {
                    rightCell.addClass('unknown');
                }
            }

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

    function showExample(level, currentNum, floor, unknownSide) {
        const number = currentNum;

        $('#example-left, #example-right, #example-result').removeClass('unknown');

        $('#example-left').text(floor.left);
        $('#example-right').text(floor.right);
        $('#example-result').text(number);

        if (unknownSide === 'left') {
            $('#example-left').addClass('unknown').text('?');
        } else if (unknownSide === 'right') {
            $('#example-right').addClass('unknown').text('?');
        } else if (unknownSide === 'result') {
            $('#example-result').addClass('unknown').text('?');
        }
    }

    function setupLevel(level, floors) {
        // Сбрасываем пользовательские значения
        floors.forEach(floor => {
            floor.userLeft = null;
            floor.userRight = null;
        });

        switch(level) {
            case 0:
                // Для обучения - заполняем ВСЕ числа
                floors.forEach(floor => {
                    floor.userLeft = floor.left;
                    floor.userRight = floor.right;
                });
                $('#houseContainer').show();
                $('#exampleContainer').hide();
                break;
            case 1:
                // Левая сторона известна
                floors.forEach(floor => {
                    floor.userLeft = floor.left;
                });
                $('#houseContainer').show();
                $('#exampleContainer').hide();
                break;
            case 2:
                // Правая сторона известна
                floors.forEach(floor => {
                    floor.userRight = floor.right;
                });
                $('#houseContainer').show();
                $('#exampleContainer').hide();
                break;
            case 3:
                // Только левое неизвестно (правое известно)
                floors.forEach(floor => {
                    floor.userRight = floor.right;
                });
                $('#houseContainer').show();
                $('#exampleContainer').hide();
                break;
            case 4:
                // Только правое неизвестно (левое известно)
                floors.forEach(floor => {
                    floor.userLeft = floor.left;
                });
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