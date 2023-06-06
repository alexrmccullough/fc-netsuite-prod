LISTAGG(NTLL.nextDoc, ',') WITHIN GROUP (ORDER BY NTLL.nextDoc) AS nextdoc


SELECT
	SO.id AS so_id,
	SO.tranid AS so_tranid,
	BUILTIN.DF(SO.entity) AS customer,
	BUILTIN.DF(SO.custbody_rd_so_route) AS routename,
	SO.shipdate,
	TransactionShipment.shippingMethod,
	Inv.tranid,
	Inv.trandate,
	Inv.duedate,
	Inv.memo,
	Inv.terms,
	Inv.otherrefnum,
	BUILTIN.DF(Inv.employee) AS salesrep,
	TransactionShippingAddress.addrText AS shipaddress,
	TransactionBillingAddress.addrText AS billingaddress,
	InvLine.itemType,
	InvLIne.accountinglinetype,
	InvLine.item AS iteminternalid,
	BUILTIN.DF(InvLine.item) AS itemname,
	Item.displayname,
	InvLine.quantity AS quantityDelivered,
	SOLine.quantity AS quantityOrdered,
	InvLine.rate,
	InvLine.netamount,
	InvLine.memo AS description,
	(TO_CHAR(SO.shipdate,'YYYYMMDD') || '_' || SO.custbody_rd_so_route || '_' ||  SO.entity || '_' || CASE WHEN Item.custitem_fc_shippedfrozen = 'T' THEN 'Frozen' ELSE 'Not Frozen' END ||  '_' || Item.itemid) AS sort1,
	(TO_CHAR(SO.shipdate, 'YYYYMMDD') || '_' ||  SO.entity || '_' || CASE WHEN Item.custitem_fc_shippedfrozen = 'T' THEN 'Frozen' ELSE 'Not Frozen' END) AS ticketsection,
	(TO_CHAR(SO.shipdate, 'YYYYMMDD') || '_' ||  SO.entity) AS uniqueshipment,
	(CASE WHEN Item.custitem_fc_shippedfrozen = 'T' THEN 'Frozen' ELSE 'Not Frozen' END) AS frozen,
	(LISTAGG(SO.tranid || ' : ' || SOLine.quantity || '<br>') WITHIN GROUP (ORDER BY SO.tranid ASC)) AS so_nums
	

FROM 
	NextTransactionLink AS NTL
	RIGHT OUTER JOIN Transaction AS SO ON (SO.id = NTL.previousDoc AND SO.type ='SalesOrd')
	RIGHT OUTER JOIN Transaction AS Inv ON (Inv.id = NTL.nextDoc AND Inv.type='CustInvc')
	INNER JOIN TransactionLine AS InvLine ON Inv.id = InvLine.transaction
	LEFT OUTER JOIN PreviousTransactionLineLink AS PTLL ON (InvLine.id = PTLL.nextline AND InvLine.transaction = PTLL.nextdoc)
	LEFT OUTER JOIN TransactionLine AS SOLine ON (SOLine.transaction = PTLL.previousDoc AND SOLine.id = PTLL.previousLine)
	LEFT OUTER JOIN TransactionBillingAddress ON Inv.billingaddress = TransactionBillingAddress.nkey
	LEFT OUTER JOIN TransactionShippingAddress ON Inv.shippingaddress = TransactionShippingAddress.nkey
	LEFT OUTER JOIN TransactionShipment ON SO.id = TransactionShipment.doc
	LEFT OUTER JOIN Item ON InvLine.item = Item.id

WHERE 
	SO.shipdate > '5/26/2023' 
	AND InvLine.mainline = 'F'

----------------

SELECT
	SO.id AS so_id,
	SO.tranid AS so_tranid,
	BUILTIN.DF(SO.entity) AS customer,
	BUILTIN.DF(SO.custbody_rd_so_route) AS routename,
	SO.shipdate,
	TransactionShipment.shippingMethod,
	Inv.tranid,
	Inv.trandate,
	Inv.duedate,
	Inv.memo,
	Inv.terms,
	Inv.otherrefnum,
	BUILTIN.DF(Inv.employee) AS salesrep,
	TransactionShippingAddress.addrText AS shipaddress,
	TransactionBillingAddress.addrText AS billingaddress,
	InvLine.itemType,
	InvLIne.accountinglinetype,
	InvLine.item AS iteminternalid,
	BUILTIN.DF(InvLine.item) AS itemname,
	Item.displayname,
	InvLine.quantity AS quantityDelivered,
	SOLine.quantity AS quantityOrdered,
	InvLine.rate,
	InvLine.netamount,
	InvLine.memo AS description

FROM 
	NextTransactionLink AS NTL
	RIGHT OUTER JOIN Transaction AS SO ON (SO.id = NTL.previousDoc AND SO.type ='SalesOrd')
	RIGHT OUTER JOIN Transaction AS Inv ON (Inv.id = NTL.nextDoc AND Inv.type='CustInvc')
	INNER JOIN TransactionLine AS InvLine ON Inv.id = InvLine.transaction
	LEFT OUTER JOIN PreviousTransactionLineLink AS PTLL ON (InvLine.id = PTLL.nextline AND InvLine.transaction = PTLL.nextdoc)
	LEFT OUTER JOIN TransactionLine AS SOLine ON (SOLine.transaction = PTLL.previousDoc AND SOLine.id = PTLL.previousLine)
	LEFT OUTER JOIN TransactionBillingAddress ON Inv.billingaddress = TransactionBillingAddress.nkey
	LEFT OUTER JOIN TransactionShippingAddress ON Inv.shippingaddress = TransactionShippingAddress.nkey
	LEFT OUTER JOIN TransactionShipment ON SO.id = TransactionShipment.doc
	LEFT OUTER JOIN Item ON InvLine.item = Item.id

WHERE 
	SO.shipdate > '5/26/2023' 
	AND InvLine.mainline = 'F'





--------------

SELECT
	SO.id AS so_id,
	SO.tranid AS so_tranid,
	BUILTIN.DF(SO.entity) AS customer,
	BUILTIN.DF(SO.custbody_rd_so_route) AS routename,
	SO.shipdate,
	Inv.tranid,
	Inv.trandate,
	Inv.duedate,
	Inv.memo,
	Inv.terms,
	Inv.otherrefnum,
	BUILTIN.DF(Inv.employee) AS salesrep,
	TransactionShippingAddress.addrText,
	InvLine.item AS iteminternalid,
	BUILTIN.DF(InvLine.item) AS itemname,
	InvLine.quantity AS quantityDelivered,
	SOLine.quantity AS quantityOrdered,
	InvLine.quantityShipRecv,
	InvLine.quantitypacked,
	InvLine.quantitybilled,
	InvLine.quantitycommitted,
	InvLine.rate,
	InvLine.netamount,
	InvLine.memo AS description

FROM 
	NextTransactionLink AS NTL
	RIGHT OUTER JOIN Transaction AS SO ON (SO.id = NTL.previousDoc AND SO.type ='SalesOrd')
	RIGHT OUTER JOIN Transaction AS Inv ON (Inv.id = NTL.nextDoc AND Inv.type='CustInvc')
	INNER JOIN TransactionLine AS InvLine ON Inv.id = InvLine.transaction
	LEFT OUTER JOIN PreviousTransactionLineLink AS PTLL ON (InvLine.id = PTLL.nextline AND InvLine.transaction = PTLL.nextdoc)
	INNER JOIN TransactionLine AS SOLine ON (SOLine.transaction = PTLL.previousDoc AND SOLine.id = PTLL.previousLine)
	LEFT OUTER JOIN TransactionBillingAddress ON Inv.billingaddress = TransactionBillingAddress.nkey
	LEFT OUTER JOIN TransactionShippingAddress ON Inv.shippingaddress = TransactionShippingAddress.nkey

WHERE 
	SO.shipdate > '5/26/2023' 
	AND InvLine.mainline = 'F'


--------------

SELECT
	SO.id AS so_id,
	SO.tranid AS so_tranid,
	BUILTIN.DF(SO.entity) AS customer,
	BUILTIN.DF(SO.custbody_rd_so_route) AS routename,
	SO.shipdate,
	Inv.tranid,
	Inv.trandate,
	Inv.duedate,
	Inv.memo,
	Inv.terms,
	Inv.otherrefnum,
	Inv.employee,
	TransactionShippingAddress.addrText,
	TL.item AS iteminternalid,
	BUILTIN.DF(TL.item) AS itemname,
	TL.quantity,
	TL.rate,
	TL.quantityShipRecv,
	TL.description

FROM 
	NextTransactionLink AS NTLL 
	RIGHT OUTER JOIN Transaction AS SO ON (SO.id = NTLL.previousDoc)
	RIGHT OUTER JOIN Transaction AS Inv ON (Inv.id = NTLL.nextDoc)
	INNER JOIN TransactionLine AS TL ON Inv.id = TL.transaction
	INNER JOIN TransactionBillingAddress ON Inv.billingaddress = TransactionBillingAddress.nkey
	INNER JOIN TransactionShippingAddress ON Inv.shippingaddress = TransactionShippingAddress.nkey

WHERE 
	SO.shipdate > '6/1/2023' 
	AND SO.type = 'SalesOrd'
	AND Inv.type = 'CustInvc'




---------------

SELECT 
	SourceDoc.entity,
	BUILTIN.DF(SourceDoc.entity),
	SourceDoc.tranid,
	SourceDoc.type,
	BUILTIN.DF(SourceDoc.custbody_rd_so_route) AS route,
	SourceDoc.shipdate,
	DestDoc.type AS dest_type,
	COUNT(DestDoc.id) AS invoice_count,
	LISTAGG(DestDoc.tranid, ',') WITHIN GROUP (ORDER BY DestDoc.tranid) AS invoices

FROM
	NextTransactionLink AS NTLL 
	RIGHT OUTER JOIN Transaction AS SourceDoc ON (SourceDoc.id = NTLL.previousDoc)
	RIGHT OUTER JOIN Transaction AS DestDoc ON (DestDoc.id = NTLL.nextDoc)

WHERE
	SourceDoc.type = 'SalesOrd' AND
	DestDoc.type = 'CustInvc'

GROUP BY
	SourceDoc.entity,
	BUILTIN.DF(SourceDoc.entity),
	SourceDoc.tranid,
	SourceDoc.type,
	BUILTIN.DF(SourceDoc.custbody_rd_so_route),
	SourceDoc.shipdate,
	DestDoc.type

------------
SELECT 
	SourceDoc.entity,
	BUILTIN.DF(SourceDoc.entity),
	SourceDoc.tranid,
	SourceDoc.type,
	BUILTIN.DF(SourceDoc.custbody_rd_so_route) AS route,
	SourceDoc.shipdate,
	DestDoc.type AS dest_type,
	COUNT(DestDoc.id) AS invoice_count,
	DestDoc.tranid AS invc_name,
	DestDoc.id AS invc_id,
	DestDoc.trandate AS invc_trandate,
	DestDoc.billaddress AS invc_billaddress,
	DestDoc.shipaddress AS invc_shipaddress,
	DestDoc.total AS invc_total,
	DestDoc.duedate AS invc_duedate,
	DestDoc.memo AS invc_memo,
	DestDoc.terms AS invc_terms,
	DestDoc.otherrefnum AS invc_otherrefnum,
	DestDoc.salesrep AS invc_salesrep,
	DestDoc.shipmethod AS invc_shipmethod

FROM
	NextTransactionLink AS NTLL 
	RIGHT OUTER JOIN Transaction AS SourceDoc ON (SourceDoc.id = NTLL.previousDoc)
	RIGHT OUTER JOIN Transaction AS DestDoc ON (DestDoc.id = NTLL.nextDoc)

WHERE
	SourceDoc.type = 'SalesOrd' AND
	DestDoc.type = 'CustInvc'

GROUP BY
	SourceDoc.entity,
	BUILTIN.DF(SourceDoc.entity),
	SourceDoc.tranid,
	SourceDoc.type,
	BUILTIN.DF(SourceDoc.custbody_rd_so_route),
	SourceDoc.shipdate,
	DestDoc.type,
	DestDoc.tranid,
	DestDoc.trandate,
	DestDoc.billaddress,
	DestDoc.shipaddress,
	DestDoc.total,
	DestDoc.duedate,
	DestDoc.memo,
	DestDoc.terms,
	DestDoc.otherrefnum,
	DestDoc.salesrep,
	DestDoc.shipmethod

-------

SELECT 
	SourceDoc.entity,
	BUILTIN.DF(SourceDoc.entity),
	SourceDoc.tranid,
	SourceDoc.type,
	BUILTIN.DF(SourceDoc.custbody_rd_so_route) AS route,
	SourceDoc.shipdate,
	DestDoc.type AS dest_type,
	COUNT(DestDoc.id) AS invoice_count,
	DestDoc.tranid AS invc_name,
	DestDoc.id AS invc_id,
	DestDoc.trandate AS invc_trandate,
	DestDoc.duedate AS invc_duedate,
	DestDoc.memo AS invc_memo,
	DestDoc.terms AS invc_terms,
	DestDoc.otherrefnum AS invc_otherrefnum,
	DestDoc.employee AS invc_salesrep

FROM
	NextTransactionLink AS NTLL 
	RIGHT OUTER JOIN Transaction AS SourceDoc ON (SourceDoc.id = NTLL.previousDoc)
	RIGHT OUTER JOIN Transaction AS DestDoc ON (DestDoc.id = NTLL.nextDoc)

WHERE
	SourceDoc.type = 'SalesOrd' AND
	DestDoc.type = 'CustInvc'

GROUP BY
	SourceDoc.entity,
	BUILTIN.DF(SourceDoc.entity),
	SourceDoc.tranid,
	SourceDoc.type,
	BUILTIN.DF(SourceDoc.custbody_rd_so_route),
	SourceDoc.shipdate,
	DestDoc.type,
	DestDoc.tranid,
	DestDoc.id,
	DestDoc.trandate,
	DestDoc.duedate,
	DestDoc.memo,
	DestDoc.terms,
	DestDoc.otherrefnum,
	DestDoc.employee

---------


	SourceDoc.entity,
	SourceDoc.tranid,
	SourceDoc.type,
	BUILTIN.DF(SourceDoc.custbody_rd_so_route),
	SourceDoc.shipdate,
	DestDoc.tranid,
	DestDoc.type




