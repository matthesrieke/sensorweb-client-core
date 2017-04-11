angular.module('n52.core.phenomena', [])
    .factory('PhenomenonListFactory', ['$rootScope', 'seriesApiInterface', 'statusService', 'settingsService', 'providerService',
        function($rootScope, seriesApiInterface, statusService, settingsService, providerService) {
            var phenomena = {};
            phenomena.selection = null;
            phenomena.items = [];

            var loadPhenomena = function() {
                phenomena.items = [];
                if (settingsService.aggregateServices && angular.isUndefined(statusService.status.apiProvider.url)) {
                    loadPhenomenaForAllProvider();
                } else {
                    loadPhenomenaForProvider(statusService.status.apiProvider.serviceID, statusService.status.apiProvider.url);
                }
            };

            var loadPhenomenaForProvider = function(serviceID, providerUrl) {
                var params = {
                    service: serviceID,
                    platformTypes: 'stationary'
                };
                seriesApiInterface.getPhenomena(null, providerUrl, params).then(function(data) {
                    addResultsToList(data, serviceID, providerUrl);
                });
            };

            var loadPhenomenaForAllProvider = function() {
                phenomena.items = [];
                providerService.doForAllServices(function(provider, url) {
                    loadPhenomenaForProvider(provider.id, url);
                });
            };

            var addResultsToList = function(results, serviceID, providerUrl) {
                angular.forEach(results, function(entry) {
                    var phenomenon = {
                        serviceID: serviceID,
                        url: providerUrl,
                        phenomenonID: entry.id
                    };
                    var idx;
                    for (var i = 0; i < phenomena.items.length; i++) {
                        if (phenomena.items[i].label.toUpperCase() === entry.label.toUpperCase()) {
                            idx = i;
                            break;
                        }
                    }
                    if (angular.isNumber(idx)) {
                        phenomena.items[idx].provider.push(phenomenon);
                    } else {
                        var newEntry = {
                            label: entry.label,
                            provider: [phenomenon]
                        };
                        phenomena.items.push(newEntry);
                    }
                });
            };

            var setSelection = function(phenomenon) {
                if (phenomenon) {
                    phenomena.selection = phenomenon;
                    $rootScope.$emit('phenomenonSelected', phenomenon);
                } else {
                    phenomena.selection = null;
                    $rootScope.$emit('allPhenomenaSelected');
                }
            };

            $rootScope.$on('newProviderSelected', loadPhenomena);

            loadPhenomena();
            return {
                setSelection: setSelection,
                phenomena: phenomena
            };
        }
    ]);
