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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VuY2UtYmF0Y2guanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvZXh0ZW5zaW9ucy9wcmVzZW5jZS1iYXRjaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQU9BLHVCQUE4QixFQUE0QztRQUExQyxzQ0FBYSxFQUFiLGtDQUFhO0lBQ3pDLE1BQU0sQ0FBQyxVQUFDLE1BQWM7UUFDbEIsSUFBSSxLQUFLLEdBQXFCLEVBQUUsRUFDNUIsWUFBaUIsQ0FBQztRQUV0QixNQUFNLENBQUMsRUFBRSxDQUFDLGlCQUFpQixFQUFFLFVBQUMsUUFBUTtZQUNsQyxZQUFZLENBQUMsWUFBWSxDQUFDLEVBQUUsWUFBWSxHQUFHLElBQUksQ0FBQztZQUNoRCxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3JCLFlBQVksR0FBRyxVQUFVLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2hELENBQUMsQ0FBQyxDQUFDO1FBRUg7WUFDSSxJQUFJLElBQXNCLENBQUM7WUFDM0IsSUFBSSxHQUFHLEtBQUssRUFBRSxLQUFLLEdBQUcsRUFBRSxDQUFDO1lBQ3pCLE1BQU0sQ0FBQyxJQUFJLENBQUMsdUJBQXVCLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDL0MsQ0FBQztJQUNMLENBQUMsQ0FBQztBQUNOLENBQUM7QUFqQkQsc0NBaUJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ2xpZW50IH0gZnJvbSAnLi4vY2xpZW50JztcclxuaW1wb3J0IHsgUHJlc2VuY2VDaGFuZ2UgfSBmcm9tICcuLi9pbnRlcmZhY2VzLmQnO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBQcmVzZW5jZUJhdGNoT3B0aW9ucyB7XHJcbiAgICB0aW1lb3V0PzogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcHJlc2VuY2VCYXRjaCh7IHRpbWVvdXQgPSAxNTAgfTogUHJlc2VuY2VCYXRjaE9wdGlvbnMgPSB7fSkge1xyXG4gICAgcmV0dXJuIChjbGllbnQ6IENsaWVudCkgPT4ge1xyXG4gICAgICAgIHZhciBiYXRjaDogUHJlc2VuY2VDaGFuZ2VbXSA9IFtdLFxyXG4gICAgICAgICAgICBiYXRjaFRpbWVvdXQ6IGFueTtcclxuXHJcbiAgICAgICAgY2xpZW50Lm9uKCdwcmVzZW5jZV9jaGFuZ2UnLCAocHJlc2VuY2UpID0+IHtcclxuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KGJhdGNoVGltZW91dCksIGJhdGNoVGltZW91dCA9IG51bGw7XHJcbiAgICAgICAgICAgIGJhdGNoLnB1c2gocHJlc2VuY2UpO1xyXG4gICAgICAgICAgICBiYXRjaFRpbWVvdXQgPSBzZXRUaW1lb3V0KHB1Ymxpc2gsIHRpbWVvdXQpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBmdW5jdGlvbiBwdWJsaXNoKCkge1xyXG4gICAgICAgICAgICB2YXIgZGF0YTogUHJlc2VuY2VDaGFuZ2VbXTtcclxuICAgICAgICAgICAgZGF0YSA9IGJhdGNoLCBiYXRjaCA9IFtdO1xyXG4gICAgICAgICAgICBjbGllbnQuZW1pdCgncHJlc2VuY2VfY2hhbmdlOmJhdGNoJywgZGF0YSk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxufVxyXG4iXX0=