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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VuY2UtYmF0Y2guanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvZXh0ZW5zaW9ucy9wcmVzZW5jZS1iYXRjaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQU9BLHVCQUE4QixFQUE0QztRQUExQyxzQ0FBYSxFQUFiLGtDQUFhO0lBQ3pDLE1BQU0sQ0FBQyxVQUFDLE1BQWM7UUFDbEIsSUFBSSxLQUFLLEdBQXFCLEVBQUUsRUFDNUIsWUFBaUIsQ0FBQztRQUV0QixNQUFNLENBQUMsRUFBRSxDQUFDLGlCQUFpQixFQUFFLFVBQUMsUUFBUTtZQUNsQyxZQUFZLENBQUMsWUFBWSxDQUFDLEVBQUUsWUFBWSxHQUFHLElBQUksQ0FBQztZQUNoRCxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3JCLFlBQVksR0FBRyxVQUFVLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2hELENBQUMsQ0FBQyxDQUFDO1FBRUg7WUFDSSxJQUFJLElBQXNCLENBQUM7WUFDM0IsSUFBSSxHQUFHLEtBQUssRUFBRSxLQUFLLEdBQUcsRUFBRSxDQUFDO1lBQ3pCLE1BQU0sQ0FBQyxJQUFJLENBQUMsdUJBQXVCLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDL0MsQ0FBQztJQUNMLENBQUMsQ0FBQztBQUNOLENBQUM7QUFqQkQsc0NBaUJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ2xpZW50IH0gZnJvbSAnLi4vY2xpZW50JztcclxuaW1wb3J0IHsgUHJlc2VuY2VDaGFuZ2UgfSBmcm9tICcuLi9pbnRlcmZhY2VzJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUHJlc2VuY2VCYXRjaE9wdGlvbnMge1xyXG4gICAgdGltZW91dD86IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHByZXNlbmNlQmF0Y2goeyB0aW1lb3V0ID0gMTUwIH06IFByZXNlbmNlQmF0Y2hPcHRpb25zID0ge30pIHtcclxuICAgIHJldHVybiAoY2xpZW50OiBDbGllbnQpID0+IHtcclxuICAgICAgICB2YXIgYmF0Y2g6IFByZXNlbmNlQ2hhbmdlW10gPSBbXSxcclxuICAgICAgICAgICAgYmF0Y2hUaW1lb3V0OiBhbnk7XHJcblxyXG4gICAgICAgIGNsaWVudC5vbigncHJlc2VuY2VfY2hhbmdlJywgKHByZXNlbmNlKSA9PiB7XHJcbiAgICAgICAgICAgIGNsZWFyVGltZW91dChiYXRjaFRpbWVvdXQpLCBiYXRjaFRpbWVvdXQgPSBudWxsO1xyXG4gICAgICAgICAgICBiYXRjaC5wdXNoKHByZXNlbmNlKTtcclxuICAgICAgICAgICAgYmF0Y2hUaW1lb3V0ID0gc2V0VGltZW91dChwdWJsaXNoLCB0aW1lb3V0KTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgZnVuY3Rpb24gcHVibGlzaCgpIHtcclxuICAgICAgICAgICAgdmFyIGRhdGE6IFByZXNlbmNlQ2hhbmdlW107XHJcbiAgICAgICAgICAgIGRhdGEgPSBiYXRjaCwgYmF0Y2ggPSBbXTtcclxuICAgICAgICAgICAgY2xpZW50LmVtaXQoJ3ByZXNlbmNlX2NoYW5nZTpiYXRjaCcsIGRhdGEpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcbn1cclxuIl19