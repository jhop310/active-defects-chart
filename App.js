Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    _allowedSeverityValues:[],
    _allowedPriorityValues:[],
    items:[
        {
            xtype: 'panel',
            itemId: 'parent',
            //layout:'hbox',  //no charts load when layout is set
            items:[
                {
                    xtype:'panel',
                    itemId: 'child1'
                } ,
                {
                    xtype:'panel',
                    itemId: 'child2'
                }
            ]
        }
    ],
    launch: function(){
        this._getModel().then({
            success: this._getAllowedPriorityValues,
            scope:this
        }).then ({
            success: this._getAllowedSeverityValues,
            scope:this
        }).then({
            success:this._getDefects,
            scope:this
         });
    } ,
    _getModel:function(){
        return Rally.data.ModelFactory.getModel({
            type:'Defect'
        });
    } ,

    _getAllowedPriorityValues:function(model) {
        var that = this;
        that._model = model;
        var deferred = Ext.create('Deft.Deferred');
        var allowedPriorityValues = [];
        model.getField('Priority').getAllowedValueStore().load({
            callback: function(records,operation,success){
                Ext.Array.each(records,function(allowedValue){
                    allowedPriorityValues.push(allowedValue.get('StringValue'));
                });
                if(success){
                    allowedPriorityValues = _.rest(allowedPriorityValues) ; //remove null
                    deferred.resolve(allowedPriorityValues);
                }
                else{
                    deferred.reject();
                }

            }
        }) ;
        return deferred.promise;

    } ,
    _getAllowedSeverityValues:function(priorityValues) {
        this._allowedPriorityValues = priorityValues;
        var deferred = Ext.create('Deft.Deferred');
        var that = this;
        var allowedSeverityValues = [] ;
        that._model.getField('Severity').getAllowedValueStore().load({
            callback: function(records,operation,success){
                Ext.Array.each(records,function(allowedValue){
                    allowedSeverityValues.push(allowedValue.get('StringValue'));
                });
                if(success){
                    allowedSeverityValues = _.rest(allowedSeverityValues) ; //remove null
                    deferred.resolve(allowedSeverityValues);
                }
                else{
                    deferred.reject();
                }
            }

        }) ;
        return deferred.promise;
    } ,

    _getDefects:function(severityValues){
        this._allowedSeverityValues = severityValues;

        Ext.create('Rally.data.wsapi.Store', {
            model: 'Defect',
            limit:Infinity,
            fetch: ['Severity','Priority'],
            autoLoad: true,
            filters:[
                {
                    property: 'State',
                    operator: '!=',
                    value:    'Closed'
                }
            ],
            listeners:{
                load:this._onDefectsLoaded,
                scope:this
            }
        });
    },
    _onDefectsLoaded:function(store, data) {


        var recordsBySeverity = {};
        var recordsByPriority = {};
        var severityColors = {};
        var priorityColors = {};
        var i = 0;
        var j = 0;
        var colors = ['#CC3300','#FF3300','#FF6600','#FF9900', '#FFCC00','#FFFF00'] ;
        var severityChartData = [];
        var priorityChartData = [];

        _.each(this._allowedSeverityValues, function(valueName){
            recordsBySeverity[valueName]  = 0;
            if(colors.length < i){
                severityColors[valueName] = colors[colors.length-1]; //if there are more allowed values then colors, default to the last element in colors array
            }
            else{
                severityColors[valueName] = colors[i];
            }
            i++;
        });

        _.each(this._allowedPriorityValues, function(valueName){
            recordsByPriority[valueName]  = 0;
            if(colors.length < i){
                priorityColors[valueName] = colors[colors.length-1]; //if there are more allowed values then colors, default to the last element in colors array
            }
            else{
                priorityColors[valueName] = colors[j];
            }
            j++;

        });

        _.each(data, function(record){
            severity = record.get('Severity') ;
            priority = record.get('Priority') ;
            recordsBySeverity[severity]++;
            recordsByPriority[priority]++;
        });

        _.each(this._allowedSeverityValues, function(valueName){
            severityChartData.push({
                name:  valueName,
                y:  recordsBySeverity[valueName],
                color: severityColors[valueName]

            });
        });

        _.each(this._allowedPriorityValues, function(valueName){
            priorityChartData.push({
                name:  valueName,
                y:  recordsByPriority[valueName],
                color: priorityColors[valueName]

            });
        });

        this.down('#child1').add({
            xtype: 'rallychart',
            height:400,
            storeType:'Rally.data.wsapi.Store',
            store:  store,
            itemId: 'defectsBySeverity',
            chartConfig:{
                chart:{},
                title:{
                    text: 'Defects By Severity' ,
                    align: 'center'
                },
                tooltip:{
                    formatter: function(){
                        return this.point.name + ': <b>' + Highcharts.numberFormat(this.percentage, 1) + '%</b><br />Count: ' + this.point.y;
                    }
                },
                plotOptions:{
                    pie:{
                        allowPointSelect:true,
                        cursor: 'pointer',
                        dataLabels:{
                            enabled:true,
                            color: '#000000',
                            connectorColor: '#000000'
                        }
                    }
                }
            },
            chartData:{
                categories: severity,
                series:[
                    {
                        type:'pie',
                        name:'Severities',
                        data: severityChartData
                    }
                ]
            }

        });

        this.down('#child2').add({
            xtype: 'rallychart',
            height:400,
            storeType:'Rally.data.wsapi.Store',
            //store:  this._defects,
            store: store,
            itemId: 'defectsByPriority',
            chartConfig:{
                chart:{},
                title:{
                    text: 'Defects By Priority' ,
                    align: 'center'
                },
                tooltip:{
                    formatter: function(){
                        return this.point.name + ': <b>' + Highcharts.numberFormat(this.percentage, 1) + '%</b><br />Count: ' + this.point.y;
                    }
                },
                plotOptions:{
                    pie:{
                        allowPointSelect:true,
                        cursor: 'pointer',
                        dataLabels:{
                            enabled:true,
                            color: '#000000',
                            connectorColor: '#000000'
                        }
                    }
                }
            },
            chartData:{
                categories: severity,
                series:[
                    {
                        type:'pie',
                        name:'Priorities',
                        data: priorityChartData
                    }
                ]
            }

        });
    }




});