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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pY2UtYmF0Y2guanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvZXh0ZW5zaW9ucy92b2ljZS1iYXRjaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQU9BLG9CQUEyQixFQUF5QztRQUF2QyxzQ0FBYSxFQUFiLGtDQUFhO0lBQ3RDLE1BQU0sQ0FBQyxVQUFDLE1BQWM7UUFDbEIsSUFBSSxLQUFLLEdBQWtCLEVBQUUsRUFDekIsWUFBaUIsQ0FBQztRQUV0QixNQUFNLENBQUMsRUFBRSxDQUFDLGNBQWMsRUFBRSxVQUFDLEtBQUs7WUFDNUIsWUFBWSxDQUFDLFlBQVksQ0FBQyxFQUFFLFlBQVksR0FBRyxJQUFJLENBQUM7WUFDaEQsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNsQixZQUFZLEdBQUcsVUFBVSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNoRCxDQUFDLENBQUMsQ0FBQztRQUVIO1lBQ0ksSUFBSSxJQUFtQixDQUFDO1lBQ3hCLElBQUksR0FBRyxLQUFLLEVBQUUsS0FBSyxHQUFHLEVBQUUsQ0FBQztZQUN6QixNQUFNLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzVDLENBQUM7SUFDTCxDQUFDLENBQUM7QUFDTixDQUFDO0FBakJELGdDQWlCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENsaWVudCB9IGZyb20gJy4uL2NsaWVudCc7XG5pbXBvcnQgeyBWb2ljZUNoYW5nZSB9IGZyb20gJy4uL2ludGVyZmFjZXMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFZvaWNlQmF0Y2hPcHRpb25zIHtcbiAgICB0aW1lb3V0PzogbnVtYmVyO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdm9pY2VCYXRjaCh7IHRpbWVvdXQgPSAxNTAgfTogVm9pY2VCYXRjaE9wdGlvbnMgPSB7fSkge1xuICAgIHJldHVybiAoY2xpZW50OiBDbGllbnQpID0+IHtcbiAgICAgICAgdmFyIGJhdGNoOiBWb2ljZUNoYW5nZVtdID0gW10sXG4gICAgICAgICAgICBiYXRjaFRpbWVvdXQ6IGFueTtcblxuICAgICAgICBjbGllbnQub24oJ3ZvaWNlX2NoYW5nZScsICh2b2ljZSkgPT4ge1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KGJhdGNoVGltZW91dCksIGJhdGNoVGltZW91dCA9IG51bGw7XG4gICAgICAgICAgICBiYXRjaC5wdXNoKHZvaWNlKTtcbiAgICAgICAgICAgIGJhdGNoVGltZW91dCA9IHNldFRpbWVvdXQocHVibGlzaCwgdGltZW91dCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGZ1bmN0aW9uIHB1Ymxpc2goKSB7XG4gICAgICAgICAgICB2YXIgZGF0YTogVm9pY2VDaGFuZ2VbXTtcbiAgICAgICAgICAgIGRhdGEgPSBiYXRjaCwgYmF0Y2ggPSBbXTtcbiAgICAgICAgICAgIGNsaWVudC5lbWl0KCd2b2ljZV9jaGFuZ2U6YmF0Y2gnLCBkYXRhKTtcbiAgICAgICAgfVxuICAgIH07XG59XG4iXX0=