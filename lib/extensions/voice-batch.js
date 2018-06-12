"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function voiceBatch(_a) {
    var _b = (_a === void 0 ? {} : _a).timeout, timeout = _b === void 0 ? 150 : _b;
    return function (client) {
        var batch = [], batchTimeout;
        client.on('voice_change', function (voice) {
            clearTimeout(batchTimeout), batchTimeout = null;
            batch.push(voice);
            batchTimeout = setTimeout(publish, timeout);
        });
        function publish() {
            var data;
            data = batch, batch = [];
            client.emit('voice_change:batch', data);
        }
    };
}
exports.voiceBatch = voiceBatch;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pY2UtYmF0Y2guanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvZXh0ZW5zaW9ucy92b2ljZS1iYXRjaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQU9BLG9CQUEyQixFQUF5QztRQUF2QyxzQ0FBYSxFQUFiLGtDQUFhO0lBQ3RDLE1BQU0sQ0FBQyxVQUFDLE1BQWM7UUFDbEIsSUFBSSxLQUFLLEdBQWtCLEVBQUUsRUFDekIsWUFBaUIsQ0FBQztRQUV0QixNQUFNLENBQUMsRUFBRSxDQUFDLGNBQWMsRUFBRSxVQUFDLEtBQUs7WUFDNUIsWUFBWSxDQUFDLFlBQVksQ0FBQyxFQUFFLFlBQVksR0FBRyxJQUFJLENBQUM7WUFDaEQsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNsQixZQUFZLEdBQUcsVUFBVSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNoRCxDQUFDLENBQUMsQ0FBQztRQUVIO1lBQ0ksSUFBSSxJQUFtQixDQUFDO1lBQ3hCLElBQUksR0FBRyxLQUFLLEVBQUUsS0FBSyxHQUFHLEVBQUUsQ0FBQztZQUN6QixNQUFNLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzVDLENBQUM7SUFDTCxDQUFDLENBQUM7QUFDTixDQUFDO0FBakJELGdDQWlCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENsaWVudCB9IGZyb20gJy4uL2NsaWVudCc7XHJcbmltcG9ydCB7IFZvaWNlQ2hhbmdlIH0gZnJvbSAnLi4vaW50ZXJmYWNlcyc7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFZvaWNlQmF0Y2hPcHRpb25zIHtcclxuICAgIHRpbWVvdXQ/OiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiB2b2ljZUJhdGNoKHsgdGltZW91dCA9IDE1MCB9OiBWb2ljZUJhdGNoT3B0aW9ucyA9IHt9KSB7XHJcbiAgICByZXR1cm4gKGNsaWVudDogQ2xpZW50KSA9PiB7XHJcbiAgICAgICAgdmFyIGJhdGNoOiBWb2ljZUNoYW5nZVtdID0gW10sXHJcbiAgICAgICAgICAgIGJhdGNoVGltZW91dDogYW55O1xyXG5cclxuICAgICAgICBjbGllbnQub24oJ3ZvaWNlX2NoYW5nZScsICh2b2ljZSkgPT4ge1xyXG4gICAgICAgICAgICBjbGVhclRpbWVvdXQoYmF0Y2hUaW1lb3V0KSwgYmF0Y2hUaW1lb3V0ID0gbnVsbDtcclxuICAgICAgICAgICAgYmF0Y2gucHVzaCh2b2ljZSk7XHJcbiAgICAgICAgICAgIGJhdGNoVGltZW91dCA9IHNldFRpbWVvdXQocHVibGlzaCwgdGltZW91dCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIHB1Ymxpc2goKSB7XHJcbiAgICAgICAgICAgIHZhciBkYXRhOiBWb2ljZUNoYW5nZVtdO1xyXG4gICAgICAgICAgICBkYXRhID0gYmF0Y2gsIGJhdGNoID0gW107XHJcbiAgICAgICAgICAgIGNsaWVudC5lbWl0KCd2b2ljZV9jaGFuZ2U6YmF0Y2gnLCBkYXRhKTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG59XHJcbiJdfQ==