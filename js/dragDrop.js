// ========== DRAG AND DROP МЕХАНИКА ==========
const DragDropManager = (function() {
    let draggedElement = null;
    let draggedDigit = null;
    let clone = null;
    let isDragging = false;

    // Колбэки для событий
    let onDropCallback = null;

    function init(onDrop) {
        onDropCallback = onDrop;

        $(document).on('mousedown', '.digit-item', startDragHandler);
        $(document).on('mousemove', moveDragHandler);
        $(document).on('mouseup', endDragHandler);

        $(document).on('touchstart', '.digit-item', touchStartHandler);
        $(document).on('touchmove', touchMoveHandler, { passive: false });
        $(document).on('touchend', touchEndHandler);

        $(document).on('mouseleave', function() {
            if (isDragging) {
                cleanup();
            }
        });
    }

    function startDragHandler(e) {
        e.preventDefault();
        startDrag(this, e.pageX, e.pageY);
    }

    function touchStartHandler(e) {
        e.preventDefault();
        const touch = e.originalEvent.touches[0];
        startDrag(this, touch.pageX, touch.pageY);
    }

    function moveDragHandler(e) {
        if (isDragging) {
            e.preventDefault();
            moveDrag(e.pageX, e.pageY);
        }
    }

    function touchMoveHandler(e) {
        if (isDragging) {
            e.preventDefault();
            const touch = e.originalEvent.touches[0];
            moveDrag(touch.pageX, touch.pageY);
        }
    }

    function endDragHandler(e) {
        if (isDragging) {
            e.preventDefault();
            endDrag(e.pageX, e.pageY);
        }
    }

    function touchEndHandler(e) {
        if (isDragging) {
            e.preventDefault();
            const touch = e.originalEvent.changedTouches[0];
            endDrag(touch.pageX, touch.pageY);
        }
    }

    function startDrag(element, x, y) {
        draggedElement = element;
        draggedDigit = $(element).data('digit');
        isDragging = true;
        GameState.update('dragActive', true);

        const rect = element.getBoundingClientRect();

        clone = $('<div>', {
            class: 'digit-clone',
            text: draggedDigit,
            css: {
                left: rect.left + (rect.width / 2) - 35,
                top: rect.top + (rect.height / 2) - 35
            }
        });

        $('body').append(clone);

        $(draggedElement).addClass('dragging');

        $('.floor-cell.empty:not(.locked), .unknown').addClass('drop-target-active');
    }

    function moveDrag(x, y) {
        if (!isDragging || !clone) return;

        clone.css({
            left: x - 35,
            top: y - 35,
            transform: `scale(1.2) rotate(${Math.sin(Date.now() / 100) * 5}deg)`
        });

        highlightTarget(x, y);
    }

    function endDrag(x, y) {
        if (!isDragging || !clone) return;

        const target = findTarget(x, y);

        if (target) {
            if (onDropCallback) {
                onDropCallback(target, draggedDigit);
            }

            clone.css({
                transform: 'scale(1.5)',
                opacity: '0',
                transition: 'all 0.2s ease'
            });

            setTimeout(() => {
                if (clone) {
                    clone.remove();
                    clone = null;
                }
            }, 200);
        } else {
            returnToOrigin();
        }

        cleanup();
    }

    function returnToOrigin() {
        if (draggedElement && clone) {
            const rect = draggedElement.getBoundingClientRect();

            clone.animate({
                left: rect.left + (rect.width / 2) - 35,
                top: rect.top + (rect.height / 2) - 35
            }, {
                duration: 300,
                easing: 'easeOutBack',
                complete: function() {
                    clone.remove();
                    clone = null;
                }
            });
        } else if (clone) {
            clone.remove();
            clone = null;
        }
    }

    function cleanup() {
        if (draggedElement) {
            $(draggedElement).removeClass('dragging');
        }

        $('.floor-cell.empty:not(.locked), .unknown').removeClass('drop-target-active');
        $('.drop-target-highlight').removeClass('drop-target-highlight');

        draggedElement = null;
        isDragging = false;
        GameState.update('dragActive', false);
    }

    function highlightTarget(x, y) {
        $('.drop-target-highlight').removeClass('drop-target-highlight');

        const target = findTarget(x, y);
        if (target) {
            $(target).addClass('drop-target-highlight');
        }
    }

    function findTarget(x, y) {
        if (clone) {
            clone.css('pointer-events', 'none');
        }

        const elements = document.elementsFromPoint(x, y);

        if (clone) {
            clone.css('pointer-events', 'none');
        }

        for (let element of elements) {
            const $el = $(element);

            if ($el.hasClass('floor-cell') && $el.hasClass('empty') && !$el.hasClass('locked')) {
                return element;
            }

            if ($el.hasClass('unknown') && $el.is('#example-left, #example-right, #example-result')) {
                return element;
            }
        }

        return null;
    }

    function createDigits(container) {
        container.empty();

        for (let i = 0; i <= 9; i++) {
            const digit = $('<div>')
                .addClass('digit-item')
                .text(i)
                .attr('data-digit', i)
                .attr('draggable', 'false');

            container.append(digit);
        }
    }

    return {
        init,
        createDigits
    };
})();