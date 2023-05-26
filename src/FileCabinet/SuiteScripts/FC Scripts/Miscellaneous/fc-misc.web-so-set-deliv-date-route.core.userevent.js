/**
 * Module Description...
 *
 * @file fc-misc.web-so-set-deliv-date-route.core.userevent.js
 * @copyright 2023 Food Connects
 * @author Alex McCullough alex.mccullough@gmail.com
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 * @NScriptType UserEventScript
 */

var
    FCLib,
    minMax,
    // isBetween,
    dayjs;

define([
    '../Libraries/fc-main.library.module',
    '../Libraries/dayjs-plugins/minMax',
    // '../Libraries/dayjs-plugins/isBetween',
    '../Libraries/dayjs.min',
], main);



function main(fcMainLib, minMaxModule, dayjsModule) {
    FCLib = fcMainLib;
    minMax = minMaxModule;
    // inBetween = isBetweenModule;
    dayjs = dayjsModule;
    dayjs = dayjs.extend(minMax);
    // dayjs = dayJs.extend(isBetween);

    function beforeSubmit(context) {
        // const oldRecStatus = context.oldRecord.getValue({
        //     fieldId: 'status'w
        // });

        log.debug({ title: 'context.type', details: context.type });

        let contexttype = context.type;         // Debugging

        if (context.type == context.UserEventType.CREATE) {
            // AND CONTEXT = WEB
            log.debug({ title: 'entering doSetDeliveryRouteFromWebOrder', details: 'context.type == context.UserEventType.CREATE' });
            doSetDeliveryRouteFromWebOrder(context);
        }

        return true;
    }

    return {
        beforeSubmit: beforeSubmit,
    };

}


function doSetDeliveryRouteFromWebOrder(context) {
    let rec = context.newRecord;
    let shipDateOptions = [];

    let custId = rec.getValue({
        fieldId: 'entity'
    });
    let shipAddressId = rec.getValue({
        fieldId: 'shipaddresslist'
    });
    log.debug({ title: 'custId', details: custId });
    log.debug({ title: 'shipAddressId', details: shipAddressId });

    // Find the closest next delivery day of the week
    // First, get the day of the week of the selected ship date
    // let customerPreferredShipDate = dayjs();   // FIX: Replace with date from SC Checkout, when it's working

    let customerPreferredShipDate = rec.getValue({
        // fieldId: 'custbody_fc_cust_web_req_delivdate2'
        fieldId: 'custbody_web_customer_delivery_date'
    });
    log.debug({ title: 'customerPreferredShipDate', details: customerPreferredShipDate });
    if (customerPreferredShipDate) { shipDateOptions.push(dayjs(customerPreferredShipDate)); }


    /****
    Determine where the current order/date time falls in relation to order cycle deadlines.
     If order came in after deadline, then the next available ship date is the next order cycle's first ship date.
     Order Cycle 1:
         Deadline: Monday, 10am
         Delivery Days: Wednesday, Thursday
     Order Cycle 2:
         Deadline: Wednesday, 10am
         Delivery Days: Friday, Saturday, Sunday, Monday, Tuesday
    ****/
    let now = dayjs();

    const orderCycle1 = {
        deadlineDay: 1,
        deadline: dayjs().day(1).hour(10).minute(0).second(0).millisecond(0),   // Monday 10am
        deliveryDays: [3, 4],    // Wednesday, Thursday
    };
    const orderCycle2 = {
        deadlineDay: 3,
        deadline: dayjs().day(3).hour(10).minute(0).second(0).millisecond(0),   // Wednesday 10am
        deliveryDays: [5, 6, 0, 1, 2]    // Friday, Saturday, Sunday, Monday
    };

    let orderCycles = [orderCycle1, orderCycle2];
    log.debug({ title: 'orderCycles', details: orderCycles });

    let thisOrderCycle;
    let weeksFromNow = 0;

    while (!thisOrderCycle) {
        for (let cycle of orderCycles) {
            if (now.isBefore(cycle.deadline)) {
                thisOrderCycle = {
                    cycle: cycle,
                    weeksFromNow: weeksFromNow
                }
                break;
            }
        }

        if (!thisOrderCycle) {
            orderCycles.forEach(cycle => {
                cycle.deadline = cycle.deadline.add(7, 'day');
            });
        }
    }

    log.debug({ title: 'thisOrderCycle', details: thisOrderCycle });

    let gapDeadlineToDelivery = (thisOrderCycle.cycle.deliveryDays[0] - thisOrderCycle.cycle.deadlineDay + 7) % 7;
    log.debug({ title: 'gapDeadlineToDelivery', details: gapDeadlineToDelivery });

    let nextAvailableShipDate = thisOrderCycle.cycle.deadline.add(gapDeadlineToDelivery, 'day');
    if (nextAvailableShipDate) { shipDateOptions.push(nextAvailableShipDate); }

    log.debug({ title: 'nextAvailableShipDate', details: nextAvailableShipDate });

    // If the preferred ship date is after the next available ship date, then use the preferred ship date.


    let targetShipDate = dayjs.max(shipDateOptions);
    log.debug({ title: 'targetShipDate', details: targetShipDate });

    if (!targetShipDate) {
        // No ship date
        log.audit({ title: 'No ship date', details: 'No ship date found in record out of Preferred Ship Date, Next Available Ship Date' });
        return;
    }

    let targetShipDay = dayjs(targetShipDate).day();
    log.debug({ title: 'targetShipDay', details: targetShipDay });


    // Look for available Stop records for this customer and ship address
    //    If we don't find any that match, default either to:
    //          Set SO Location to null so that the Static Route Management script doesn't complain
    //          OR Create a new No Route stop for this customer/address on the target ship date.
    let availRouteStops = runAvailableRouteQuery(custId, [shipAddressId]);
    let liveStops = availRouteStops.filter(stop => stop.routeisnoroute == 'F');

    let selectedStop;
    let selectedShipDate;

    if (liveStops.length <= 0) {
        // No live stops found. Are there any No-Route stops for the target ship date? 
        // Determine whether availRouteStops contains a Stop that isn't part of a No-Route route
        let noRouteStop = false;
        let noRouteStops = availRouteStops.filter(stop => stop.routeisnoroute == 'T');
        for (let thisStop of noRouteStops) {
            let stopDays = thisStop.routestopdays.split(',').map(day => parseInt(day));
            if (stopDays.includes(targetShipDay)) {
                // Yes, there is a No-Route stop for the target ship date. Use it.
                noRouteStop = thisStop; 
            }
        }

        // If we didn't find any No-Route stops for this customer/address on the target ship date, 
        //    then create a Stop on a No-Route Route that ships on this day and assign it.
        if (!noRouteStop) {
            // Find a Route that ships on the target ship day
            let noRouteRoutes = runNoRouteQuery(targetShipDay);
            if ((!noRouteRoutes) || (noRouteRoutes.length <= 0)) {
                log.error({ title: 'No No-Route routes found', details: 'No No-Route routes found that ship on the target ship day' });
                throw new Error('No No-Route routes found that ship on the target ship day');
            }

            // Create a new No-Route stop for this customer/address on the target ship date.
            noRouteStop = createNoRouteStop(custId, shipAddressId, noRouteRoutes[0].id);
            log.debug({ title: 'noRouteStop after creation', details: noRouteStop })
        }

        selectedStop = noRouteStop;
        log.debug({ title: 'selectedStop in no-route stop', details: selectedStop });
        selectedShipDate = targetShipDate;
        log.debug({ title: 'selectedShipDate in no-route stop', details: selectedShipDate })

    } else {
        // Now, find the next delivery day of the week
        let routeDayOptions = Array.from(new Array(7), () => []);

        for (let thisStop of liveStops) {
            // Get the stop days for this stop's route
            let routeStopDays = thisStop.routestopdays.split(',');

            // For each stop day in the route, add the stop to the routeDayOptions array,
            //   where the array index represents is the number of days in the future
            //   from the target ship date.
            for (let stopDay of routeStopDays) {
                let stopDayIndex = (stopDay - targetShipDay + 7) % 7;
                routeDayOptions[stopDayIndex].push(thisStop);
            }
        }
        log.debug({ title: 'routeDayOptions', details: routeDayOptions });

        // Now, find the first non-empty array in the routeDayOptions array
        let routeDayIndex = routeDayOptions.findIndex((day) => day.length > 0);
        log.debug({ title: 'routeDayIndex', details: routeDayIndex });

        if (routeDayIndex == -1) {
            // No available routes for this customer
            log.audit({ title: 'No available routes', details: 'No available routes found for customer' });
            return;
        }
        // Select one of the stops. For now, it will be the first in the list. 
        selectedStop = routeDayOptions[routeDayIndex][0];
        selectedShipDate = dayjs(targetShipDate).add(routeDayIndex, 'day');
    }

    // Set the delivery route information on the SO. This includes:
    //    shipdate
    //    shipaddresslist
    //    custpage_available_routes_field
    const shipRouteId = selectedStop.custrecord_rd_stop_route;
    const shipAddressIdUpdated = selectedStop.custrecord_rd_stop_delivery_address;
    const stopNumber = selectedStop.custrecord_rd_stop_number;
    const shipRouteName = selectedStop.routename;

    log.debug({ title: 'selectedShipDate', details: selectedShipDate });
    log.debug({ title: 'shipRouteId', details: shipRouteId });
    log.debug({ title: 'shipAddressIdUpdated', details: shipAddressIdUpdated });
    log.debug({ title: 'stopNumber', details: stopNumber });
    log.debug({ title: 'shipRouteName', details: shipRouteName });

    rec.setValue({
        fieldId: 'shipdate',
        value: selectedShipDate.toDate()
    });

    rec.setValue({
        fieldId: 'shipaddresslist',
        value: shipAddressIdUpdated
    });

    // rec.setValue({
    //     fieldId: 'custbody_rd_so_address_id',
    //     value: shipAddressIdUpdated
    // });

    rec.setValue({
        fieldId: 'custpage_available_routes_field',
        value: shipRouteId
        // value: shipRouteName
    });

    // rec.setValue({
    //     fieldId: 'custbody_rd_so_route',
    //     value: shipRouteId
    // });

    rec.setValue({
        fieldId: 'custpage_route_stop_field',
        value: stopNumber
    });

    // rec.setValue({
    //     fieldId: 'custbody_rd_so_stop',
    //     value: stopNumber
    // });

    // rec.setValue({
    //     fieldId: 'custbody_rd_total_weight_kgs',
    //     value: 100.0
    // });
    // rec.setValue({
    //     fieldId: 'custbody_rd_total_weight_lbs',
    //     value: 220.0
    // });
    // rec.setValue({
    //     fieldId: 'custbody_rd_so_delivery_from_time',
    //     value: '8:00 AM'
    // });
    // rec.setValue({
    //     fieldId: 'custbody_rd_so_delivery_to_time',
    //     value: '5:00 PM'
    // });




}



function createNoRouteStop(custId, shipAddressId, routeId) {
    // Run query on this route to get the next stop number
    let nextStopNumber = getNextStopNumber(routeId);

    // Create the record
    let rec = record.create({
        type: 'CUSTOMRECORD_RD_ROUTE_STOPS',
        isDynamic: true
    });

    // Set field values: 
    //  custrecord_rd_stop_customer
    //  custrecord_rd_stop_address
    //  custrecord_rd_stop_line_subsidiary
    //  custrecord_rd_stop_delivery_address
    //  custrecord_rd_stop_number
    //  custrecord_rd_stop_route
    rec.setValue({
        fieldId: 'custrecord_rd_stop_route',
        value: routeId
    });
    rec.setValue({
        fieldId: 'custrecord_rd_stop_number',
        value: nextStopNumber
    });

    rec.setValue({
        fieldId: 'custrecord_rd_stop_customer',
        value: custId
    });
    rec.setValue({
        fieldId: 'custrecord_rd_stop_delivery_address',
        value: shipAddressId
    });
    // rec.setValue({
    //     fieldId: 'custrecord_rd_stop_address',
    //     value: FIX
    // });
    // rec.setValue({
    //     fieldId: 'custrecord_rd_stop_line_subsidiary',
    //     value: 1    // Food Connects, Inc
    // });



    const recId = rec.save();


    return {
        custrecord_rd_stop_route: routeId,
        custrecord_rd_stop_delivery_address: shipAddressId,
        custrecord_rd_stop_number: nextStopNumber
    };
}

function getNextStopNumber(routeId) {
    log.debug({ title: 'getNextStopNumber - routeId', details: routeId })
    let queryTemplate = `
        SELECT MAX(custrecord_rd_stop_number) AS maxstopnumber
        FROM CUSTOMRECORD_RD_ROUTE_STOPS
        WHERE custrecord_rd_stop_route = @@ROUTE_ID@@
    `;

    let theQuery = queryTemplate.replace('@@ROUTE_ID@@', routeId);
    let queryResults = FCLib.sqlSelectAllRows(theQuery);
    log.debug({ title: 'getNextStopNumber - queryResults', details: queryResults });
    let maxStopNumber = queryResults[0].maxstopnumber;
    log.debug({ title: 'getNextStopNumber - maxStopNumber', details: maxStopNumber })
    let nextStopNumber = parseInt(maxStopNumber) + 1;
    log.debug({ title: 'getNextStopNumber - nextStopNumber', details: nextStopNumber });

    return nextStopNumber;
}



function runNoRouteQuery(shipDay) {
    log.debug({ title: 'runNoRouteQuery', details: shipDay })
    const queryTemplate = `
        SELECT *
        FROM CUSTOMRECORD_RD_ROUTE
        WHERE custrecord_rd_route_isautogenerated = 'T'
            AND isinactive = 'F'
    `;

    let theQuery = queryTemplate;
    let queryResults = FCLib.sqlSelectAllRows(theQuery);

    queryResults = queryResults.filter((route) => {
        let routeStopDays = route.custrecord_rd_delivery_days_option.split(',').map((day) => parseInt(day));
        return routeStopDays.includes(shipDay);
    });

    return queryResults;
}


function runAvailableRouteQuery(custId, addressIds) {
    let queryTemplate = `
        WITH CustStops AS (
            SELECT *
            FROM CUSTOMRECORD_RD_ROUTE_STOPS AS Stops
            WHERE
                Stops.isInactive = 'F'
                AND Stops.custrecord_rd_stop_customer = @@CUST_ID@@
                AND Stops.custrecord_rd_stop_delivery_address IN (@@ADDRESS_IDS@@)
        ), AvailRoutes AS (
            SELECT *
            FROM CUSTOMRECORD_RD_ROUTE AS Route
            WHERE
                Route.id IN (SELECT custrecord_rd_stop_route FROM CustStops)
                AND Route.isInactive = 'F'
        )
        SELECT 
            Customer.id,
            Customer.companyname,
            Customer.firstname,
            Customer.lastname,
            CustStops.id AS stopid,
            CustStops.custrecord_rd_stop_address,
            CustStops.custrecord_rd_stop_delivery_address,
            CustStops.name AS stopname,
            CustStops.custrecord_rd_stop_route,
            CustStops.custrecord_rd_stop_number,
            AvailRoutes.id AS routeid,
            AvailRoutes.name AS routename,
            AvailRoutes.custrecord_rd_delivery_days_option AS routestopdays,
            AvailRoutes.custrecord_rd_route_isautogenerated AS routeisnoroute

        FROM Customer
        JOIN CustStops ON Customer.id = CustStops.custrecord_rd_stop_customer
        JOIN AvailRoutes ON CustStops.custrecord_rd_stop_route = AvailRoutes.id
        
        WHERE
            Customer.id = @@CUST_ID@@
    `;

    let theQuery = queryTemplate.replaceAll('@@CUST_ID@@', custId);
    theQuery = theQuery.replaceAll('@@ADDRESS_IDS@@', addressIds.map(x => `'${x}'`).join(','));
    log.debug({ title: 'query', details: theQuery });

    let queryResults = FCLib.sqlSelectAllRows(theQuery);
    log.debug({ title: 'queryResults', details: queryResults });

    return queryResults;
}
