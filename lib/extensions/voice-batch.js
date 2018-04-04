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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pY2UtYmF0Y2guanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvZXh0ZW5zaW9ucy92b2ljZS1iYXRjaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQU9BLG9CQUEyQixFQUF5QztRQUF2QyxzQ0FBYSxFQUFiLGtDQUFhO0lBQ3RDLE1BQU0sQ0FBQyxVQUFDLE1BQWM7UUFDbEIsSUFBSSxLQUFLLEdBQWtCLEVBQUUsRUFDekIsWUFBaUIsQ0FBQztRQUV0QixNQUFNLENBQUMsRUFBRSxDQUFDLGNBQWMsRUFBRSxVQUFDLEtBQUs7WUFDNUIsWUFBWSxDQUFDLFlBQVksQ0FBQyxFQUFFLFlBQVksR0FBRyxJQUFJLENBQUM7WUFDaEQsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNsQixZQUFZLEdBQUcsVUFBVSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNoRCxDQUFDLENBQUMsQ0FBQztRQUVIO1lBQ0ksSUFBSSxJQUFtQixDQUFDO1lBQ3hCLElBQUksR0FBRyxLQUFLLEVBQUUsS0FBSyxHQUFHLEVBQUUsQ0FBQztZQUN6QixNQUFNLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzVDLENBQUM7SUFDTCxDQUFDLENBQUM7QUFDTixDQUFDO0FBakJELGdDQWlCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENsaWVudCB9IGZyb20gJy4uL2NsaWVudCc7XHJcbmltcG9ydCB7IFZvaWNlQ2hhbmdlIH0gZnJvbSAnLi4vaW50ZXJmYWNlcy5kJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgVm9pY2VCYXRjaE9wdGlvbnMge1xyXG4gICAgdGltZW91dD86IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHZvaWNlQmF0Y2goeyB0aW1lb3V0ID0gMTUwIH06IFZvaWNlQmF0Y2hPcHRpb25zID0ge30pIHtcclxuICAgIHJldHVybiAoY2xpZW50OiBDbGllbnQpID0+IHtcclxuICAgICAgICB2YXIgYmF0Y2g6IFZvaWNlQ2hhbmdlW10gPSBbXSxcclxuICAgICAgICAgICAgYmF0Y2hUaW1lb3V0OiBhbnk7XHJcblxyXG4gICAgICAgIGNsaWVudC5vbigndm9pY2VfY2hhbmdlJywgKHZvaWNlKSA9PiB7XHJcbiAgICAgICAgICAgIGNsZWFyVGltZW91dChiYXRjaFRpbWVvdXQpLCBiYXRjaFRpbWVvdXQgPSBudWxsO1xyXG4gICAgICAgICAgICBiYXRjaC5wdXNoKHZvaWNlKTtcclxuICAgICAgICAgICAgYmF0Y2hUaW1lb3V0ID0gc2V0VGltZW91dChwdWJsaXNoLCB0aW1lb3V0KTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgZnVuY3Rpb24gcHVibGlzaCgpIHtcclxuICAgICAgICAgICAgdmFyIGRhdGE6IFZvaWNlQ2hhbmdlW107XHJcbiAgICAgICAgICAgIGRhdGEgPSBiYXRjaCwgYmF0Y2ggPSBbXTtcclxuICAgICAgICAgICAgY2xpZW50LmVtaXQoJ3ZvaWNlX2NoYW5nZTpiYXRjaCcsIGRhdGEpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcbn1cclxuIl19