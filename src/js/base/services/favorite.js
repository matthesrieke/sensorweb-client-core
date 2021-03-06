angular.module('n52.core.base')
    .factory('favoriteService', ['localStorageService', '$translate', 'settingsService', 'seriesApiInterface',
        function(localStorageService, $translate, settingsService, seriesApiInterface) {
            var storageKey = 'favorites';
            var favorites = {};
            var groupIdx = Object.keys(favorites).length;
            if (groupIdx === 0) groupIdx++;

            // load favorites
            setFavorites(localStorageService.get(storageKey));

            function saveFavorites() {
                localStorageService.set(storageKey, favorites);
            }

            function addFavorite(ts, label) {
                label = label || ts.label;
                favorites[ts.apiUrl + ts.id] = {
                    id: ts.apiUrl + ts.id,
                    label: label,
                    type: 'single',
                    timeseries: angular.copy(ts)
                };
                saveFavorites();
                return label;
            }

            function addFavoriteGroup(tsColl, label) {
                var collection = [];
                angular.forEach(tsColl, function(elem) {
                    collection.push(angular.copy(elem));
                });
                if (collection.length !== 0) {
                    label = label || $translate.instant('favorite.label') + ' ' + groupIdx;
                    favorites[groupIdx] = {
                        id: groupIdx,
                        label: label,
                        type: 'group',
                        collection: collection
                    };
                    saveFavorites();
                    groupIdx++;
                    return label;
                } else {
                    return null;
                }
            }

            function removeFavorite(fav) {
                delete favorites[fav.id];
                saveFavorites();
            }

            function hasTimeseriesAsFavorite(ts) {
                return angular.isObject(favorites[ts.apiUrl + ts.id]);
            }

            function hasFavorites() {
                return Object.keys(favorites).length > 0;
            }

            function getFavoritesCount() {
                return Object.keys(favorites).length;
            }

            function removeAllFavorites() {
                angular.forEach(favorites, function(elem) {
                    removeFavorite(elem);
                });
            }

            function setFavorites(newFavs) {
                removeAllFavorites();
                angular.forEach(newFavs, function(fav) {
                    // single
                    if (fav.timeseries) {
                        // send request to get latest value
                        var oldTs = fav.timeseries;
                        seriesApiInterface.getTimeseries(oldTs.id, oldTs.apiUrl).then(function(newTs) {
                            newTs.styles = oldTs.styles;
                            addFavorite(newTs, fav.label);
                        });
                    }
                    // group
                    if (fav.collection) {
                        var count = 0;
                        var newColl = [];
                        angular.forEach(fav.collection, function(ts) {
                            count++;
                            seriesApiInterface.getTimeseries(ts.id, ts.apiUrl).then(function(newTs) {
                                newTs.styles = ts.styles;
                                newColl.push(newTs);
                                count--;
                                if (count === 0) {
                                    addFavoriteGroup(newColl, fav.label);
                                }
                            });
                        });
                    }
                });
                saveFavorites();
            }

            function changeLabel(favorite, label) {
                favorites[favorite.id].label = label;
                saveFavorites();
            }

            return {
                addFavorite: addFavorite,
                addFavoriteGroup: addFavoriteGroup,
                hasTimeseriesAsFavorite: hasTimeseriesAsFavorite,
                hasFavorites: hasFavorites,
                setFavorites: setFavorites,
                removeFavorite: removeFavorite,
                removeAllFavorites: removeAllFavorites,
                changeLabel: changeLabel,
                getFavoritesCount: getFavoritesCount,
                favorites: favorites
            };
        }
    ])
    .factory('favoriteImExportService', ['favoriteService', '$translate', 'alertService', 'utils',
        function(favoriteService, $translate, alertService, utils) {
            function importFavorites(event) {
                if (utils.isFileAPISupported() && angular.isObject(event)) {
                    var override = true;
                    if (favoriteService.hasFavorites()) {
                        override = window.confirm($translate.instant('favorite.import.override'));
                    }
                    if (override) {
                        var files = event.target.files;
                        if (files && files.length > 0) {
                            var reader = new window.FileReader();
                            reader.readAsText(files[0]);
                            reader.onerror = function() {
                                alertService.error($translate.instant('favorite.import.wrongFile'));
                            };
                            reader.onload = $.proxy(function(e) {
                                favoriteService.setFavorites(angular.fromJson(e.target.result));
                            }, this);
                        }
                    }
                }
            }

            function exportFavorites() {
                if (utils.isFileAPISupported()) {
                    var filename = 'favorites.json';
                    var content = angular.toJson(favoriteService.favorites, 2);
                    if (window.navigator.msSaveBlob) {
                        // IE version >= 10
                        var blob = new window.Blob([content], {
                            type: 'application/json;charset=utf-8;'
                        });
                        window.navigator.msSaveBlob(blob, filename);
                    } else {
                        // FF, Chrome ...
                        var a = document.createElement('a');
                        a.href = 'data:application/json,' + encodeURIComponent(content);
                        a.target = '_blank';
                        a.download = filename;
                        document.body.appendChild(a);
                        a.click();
                    }
                }
            }

            return {
                importFavorites: importFavorites,
                exportFavorites: exportFavorites
            };
        }
    ]);
