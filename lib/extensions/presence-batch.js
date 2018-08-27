"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function presenceBatch(_a) {
    var _b = (_a === void 0 ? {} : _a).timeout, timeout = _b === void 0 ? 150 : _b;
    return function (client) {
        var batch = [], batchTimeout;
        client.on('presence_change', function (presence) {
            clearTimeout(batchTimeout), batchTimeout = null;
            batch.push(presence);
            batchTimeout = setTimeout(publish, timeout);
        });
        function publish() {
            var data;
            data = batch, batch = [];
            client.emit('presence_change:batch', data);
        }
    };
}
exports.presenceBatch = presenceBatch;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VuY2UtYmF0Y2guanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvZXh0ZW5zaW9ucy9wcmVzZW5jZS1iYXRjaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQU9BLHVCQUE4QixFQUE0QztRQUExQyxzQ0FBYSxFQUFiLGtDQUFhO0lBQ3pDLE1BQU0sQ0FBQyxVQUFDLE1BQWM7UUFDbEIsSUFBSSxLQUFLLEdBQXFCLEVBQUUsRUFDNUIsWUFBaUIsQ0FBQztRQUV0QixNQUFNLENBQUMsRUFBRSxDQUFDLGlCQUFpQixFQUFFLFVBQUMsUUFBUTtZQUNsQyxZQUFZLENBQUMsWUFBWSxDQUFDLEVBQUUsWUFBWSxHQUFHLElBQUksQ0FBQztZQUNoRCxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3JCLFlBQVksR0FBRyxVQUFVLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2hELENBQUMsQ0FBQyxDQUFDO1FBRUg7WUFDSSxJQUFJLElBQXNCLENBQUM7WUFDM0IsSUFBSSxHQUFHLEtBQUssRUFBRSxLQUFLLEdBQUcsRUFBRSxDQUFDO1lBQ3pCLE1BQU0sQ0FBQyxJQUFJLENBQUMsdUJBQXVCLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDL0MsQ0FBQztJQUNMLENBQUMsQ0FBQztBQUNOLENBQUM7QUFqQkQsc0NBaUJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ2xpZW50IH0gZnJvbSAnLi4vY2xpZW50JztcbmltcG9ydCB7IFByZXNlbmNlQ2hhbmdlIH0gZnJvbSAnLi4vaW50ZXJmYWNlcyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUHJlc2VuY2VCYXRjaE9wdGlvbnMge1xuICAgIHRpbWVvdXQ/OiBudW1iZXI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwcmVzZW5jZUJhdGNoKHsgdGltZW91dCA9IDE1MCB9OiBQcmVzZW5jZUJhdGNoT3B0aW9ucyA9IHt9KSB7XG4gICAgcmV0dXJuIChjbGllbnQ6IENsaWVudCkgPT4ge1xuICAgICAgICB2YXIgYmF0Y2g6IFByZXNlbmNlQ2hhbmdlW10gPSBbXSxcbiAgICAgICAgICAgIGJhdGNoVGltZW91dDogYW55O1xuXG4gICAgICAgIGNsaWVudC5vbigncHJlc2VuY2VfY2hhbmdlJywgKHByZXNlbmNlKSA9PiB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQoYmF0Y2hUaW1lb3V0KSwgYmF0Y2hUaW1lb3V0ID0gbnVsbDtcbiAgICAgICAgICAgIGJhdGNoLnB1c2gocHJlc2VuY2UpO1xuICAgICAgICAgICAgYmF0Y2hUaW1lb3V0ID0gc2V0VGltZW91dChwdWJsaXNoLCB0aW1lb3V0KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZnVuY3Rpb24gcHVibGlzaCgpIHtcbiAgICAgICAgICAgIHZhciBkYXRhOiBQcmVzZW5jZUNoYW5nZVtdO1xuICAgICAgICAgICAgZGF0YSA9IGJhdGNoLCBiYXRjaCA9IFtdO1xuICAgICAgICAgICAgY2xpZW50LmVtaXQoJ3ByZXNlbmNlX2NoYW5nZTpiYXRjaCcsIGRhdGEpO1xuICAgICAgICB9XG4gICAgfTtcbn1cbiJdfQ==