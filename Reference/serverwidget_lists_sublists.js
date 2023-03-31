function buildPoSelectREGULARLIST(context, list, poQueryResults) {

        // sublist.addRefreshButton();
        // sublist.addMarkAllButtons();

        // Add fields to the sublist
        let fieldDefs = ThisAppLib.Settings.Ui.Sublists.SELECT_POS.Fields;
        for (let fieldDef of Object.values(fieldDefs)) {
            let newCol = list.addField({
                id: fieldDef.Id,
                type: fieldDef.Type,
                label: fieldDef.Label,
            })
            // newField.updateDisplayType({
            //     displayType: fieldDef.DisplayType
            // });

        }

        // Add data to the sublist
        // First, sort the list by PO ID
        let sortField = ThisAppLib.Settings.Ui.Sublists.SELECT_POS.Fields.PoDisplayName.UnsentPoQuerySource.fieldid;

        let poQueryResultsSorted = FCLib.sortArrayOfObjsByKey(poQueryResults, sortField, true);

        // Loop through sorted query results and add them to the list
        for (let i = 0; i < poQueryResultsSorted.length; i++) {
            let queryRow = poQueryResultsSorted[i];

            let convertedRow = {};

            for (let fieldDef of Object.values(fieldDefs)) {
                let fieldId = fieldDef.Id;
                let fieldVal = ('DefaultValue' in fieldDef) ? fieldDef.DefaultValue : null;

                if ('UnsentPoQuerySource' in fieldDef) {
                    fieldVal = row[fieldDef.UnsentPoQuerySource.fieldid];
                }

                if (fieldVal !== null) {
                    if ('TypeFunc' in fieldDef){ fieldVal = fieldDef.TypeFunc(fieldVal); }

                    convertedRow[fieldId] = fieldVal;
                    // sublist.setSublistValue({
                    //     id: fieldId,
                    //     line: i,
                    //     value: fieldVal,
                    // });
                }
            }
            list.addRow({
                row: convertedRow
            });

        }

    }



    function buildPoSelectSublist(context, sublist, poQueryResults) {

        // sublist.addRefreshButton();
        // sublist.addMarkAllButtons();

        // Add fields to the sublist
        let fieldDefs = ThisAppLib.Settings.Ui.Sublists.SELECT_POS.Fields;
        for (let fieldDef of Object.values(fieldDefs)) {
            let newField = sublist.addField({
                id: fieldDef.Id,
                type: fieldDef.Type,
                label: fieldDef.Label,
            })
            newField.updateDisplayType({
                displayType: fieldDef.DisplayType
            });

        }

        // Add data to the sublist
        // First, sort the list by PO ID
        let sortField = ThisAppLib.Settings.Ui.Sublists.SELECT_POS.Fields.PoDisplayName.UnsentPoQuerySource.fieldid;

        let poQueryResultsSorted = FCLib.sortArrayOfObjsByKey(poQueryResults, sortField, true);

        // Loop through sorted query results and add them to the list
        for (let i = 0; i < poQueryResultsSorted.length; i++) {
            let row = poQueryResultsSorted[i];

            for (let fieldDef of Object.values(fieldDefs)) {
                let fieldId = fieldDef.Id;
                let fieldVal = ('DefaultValue' in fieldDef) ? fieldDef.DefaultValue : null;

                if ('UnsentPoQuerySource' in fieldDef) {
                    fieldVal = row[fieldDef.UnsentPoQuerySource.fieldid];
                }

                if (fieldVal !== null) {
                    if ('TypeFunc' in fieldDef){ fieldVal = fieldDef.TypeFunc(fieldVal); }

                    sublist.setSublistValue({
                        id: fieldId,
                        line: i,
                        value: fieldVal,
                    });
                }
            }

        }

    }
