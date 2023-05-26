================================
WORKING
===========================


SELECT 
	LISTAGG(CommerceCategory.id, ', ') WITHIN GROUP (ORDER BY CommerceCategory.id) "ID",
	Item.id,
	Item.itemid
FROM CommerceCategory
JOIN CommerceCategoryItemAssociation AS CatItemAssoc ON CatItemAssoc.category = CommerceCategory.id
JOIN Item ON CatItemAssoc.item = item.id
LEFT OUTER JOIN CommerceCategoryAssociation  AS CatAssoc ON CommerceCategory.id = CatAssoc.subcategory 

GROUP BY
	Item.id,
	Item.itemid
ORDER BY 
	Item.itemid


================================ 
    
    
    
    WITH FullCatHier AS (
		SELECT 
		CommerceCategory.id AS catid,
		CommerceCategory.name AS catname,
		CommerceCategory.primaryparent as catparent,
		CommCatAssoc.subcategory AS subcategory,
		CommCatAssoc2.subcategory AS subsubcategory,
		CommCatAssoc3.subcategory AS subsubsubcategory,
		(CommerceCategory.id || '-' || CommCatAssoc.subcategory || '-' || CommCatAssoc2.subcategory) AS categoryhier
			
			
FROM
	CommerceCategory
LEFT OUTER JOIN CommerceCategoryAssociation AS CommCatAssoc ON CommCatAssoc.category = CommerceCategory.id
LEFT OUTER JOIN CommerceCategoryAssociation AS CommCatAssoc2 ON CommCatAssoc2.category = CommCatAssoc.subcategory
LEFT OUTER JOIN CommerceCategoryAssociation AS CommCatAssoc3 ON CommCatAssoc3.category = CommCatAssoc2.subcategory

WHERE
	CommerceCategory.primaryparent IS NULL

)

SELECT * FROM 
(
	SELECT
		('' || FullCatHier.catid) AS cathier,
		FulLCatHier.catid AS node
	FROM 
		FullCatHier

	UNION

	SELECT 
		(FullCatHier.catid || '-' || FullCatHier.subcategory) AS cathier,
		FulLCatHier.subcategory AS node

	FROM
		FullCatHier
	WHERE
		FullCatHier.subcategory IS NOT NULL

	UNION

	SELECT
		(FullCatHier.catid || '-' || FullCatHier.subcategory || '-' || FullCatHier.subsubcategory) AS cathier,
		FulLCatHier.subsubcategory AS node
	FROM
		FullCatHier
	WHERE
		FullCatHier.subsubcategory IS NOT NULL
)
WHERE
	node IN ('117')



==============================



SELECT 
	CommerceCategory.id,
	CommerceCategory.name,
	CommerceCategory.primaryparent,
	BUILTIN.DF(CommerceCategory.primaryparent) as primaryparentname,
	Item.id,
	Item.itemid,
	Item.displayname
FROM CommerceCategory
JOIN CommerceCategoryItemAssociation AS CommCatAssoc ON CommCatAssoc.category = CommerceCategory.id
JOIN Item ON CommCatAssoc.item = item.id



SELECT 
	CommerceCategory.id,
	CommerceCategory.name,
	c2.*
FROM CommerceCategory
LEFT OUTER JOIN CommerceCategoryAssociation  AS c2 ON CommerceCategory.id = c2.subcategory 


============================================


WITH ItemCatLevel0 AS (
	SELECT 
		CommerceCategory.id AS catid,
		CommerceCategory.name AS catname,
		CommerceCategory.primaryparent as catparent,
		BUILTIN.DF(CommerceCategory.primaryparent) as primaryparentname,
		Item.id AS itemid,
		Item.itemid AS itemname,
		Item.displayname AS itemdisplayname,
		0 AS level
	FROM CommerceCategory
	JOIN CommerceCategoryItemAssociation AS CommCatAssoc ON CommCatAssoc.category = CommerceCategory.id
	JOIN Item ON CommCatAssoc.item = Item.id
	WHERE CommerceCategory.primaryparent IS NULL
), ItemCatLevel1 AS (
	SELECT 
		CommerceCategory.id AS catid,
		CommerceCategory.name AS catname,
		CommerceCategory.primaryparent as catparent,
		BUILTIN.DF(CommerceCategory.primaryparent) as primaryparentname,
		Item.id AS itemid,
		Item.itemid AS itemname,
		Item.displayname AS itemdisplayname,
		1 as level
	FROM CommerceCategory
	JOIN CommerceCategoryItemAssociation AS CommCatAssoc ON (CommCatAssoc.category = CommerceCategory.id)
	JOIN Item ON (CommCatAssoc.item = Item.id)
	WHERE CommerceCategory.primaryparent IN (SELECT catid FROM ItemCatLevel0)
)


(SELECT
catid,
catname,
catparent,
primaryparentname,
itemid,
itemname,
itemdisplayname
FROM ItemCatLevel0)
UNION ALL
(SELECT
catid,
catname,
catparent,
primaryparentname,
itemid,
itemname,
itemdisplayname
FROM ItemCatLevel1)

SELECT 

	UNION ALL
	SELECT 
		CommerceCategory.id,
		CommerceCategory.name,
		CommerceCategory.primaryparent,
		BUILTIN.DF(CommerceCategory.primaryparent) as primaryparentname,
		Item.id,
		Item.itemid,
		Item.displayname,
		level + 1
	FROM CommerceCategory
	JOIN CommerceCategoryItemAssociation AS CommCatAssoc ON CommCatAssoc.category = CommerceCategory.id
	JOIN Item ON CommCatAssoc.item = item.id
	WHERE CommerceCategory.primaryparent = CommerceCategory.id
)
)

SELECT 
	LISTAGG(CommerceCategory.id, ', ') WITHIN GROUP (ORDER BY CommerceCategory.id) AS id,
	CommerceCategory.name,
	Item.id,
	Item.itemid
FROM CommerceCategory
JOIN CommerceCategoryItemAssociation AS CatItemAssoc ON CatItemAssoc.category = CommerceCategory.id
JOIN Item ON CatItemAssoc.item = item.id
LEFT OUTER JOIN CommerceCategoryAssociation  AS CatAssoc ON CommerceCategory.id = CatAssoc.subcategory 

ORDER BY 
	Item.itemid








-----------------------


WITH ItemCatLevel0 AS (
	SELECT 
		CommerceCategory.id AS catid,
		CommerceCategory.name AS catname,
		CommerceCategory.primaryparent as catparent,
		BUILTIN.DF(CommerceCategory.primaryparent) as primaryparentname,
		Item.id AS itemid,
		Item.itemid AS itemname,
		Item.displayname AS itemdisplayname,
		0 AS thelevel
	FROM CommerceCategory
	JOIN CommerceCategoryItemAssociation AS CommCatAssoc ON CommCatAssoc.category = CommerceCategory.id
	JOIN Item ON CommCatAssoc.item = Item.id
	WHERE CommerceCategory.primaryparent IS NULL
), ItemCatLevel1 AS (
	SELECT 
		CommerceCategory.id AS catid,
		CommerceCategory.name AS catname,
		CommerceCategory.primaryparent as catparent,
		BUILTIN.DF(CommerceCategory.primaryparent) as primaryparentname,
		Item.id AS itemid,
		Item.itemid AS itemname,
		Item.displayname AS itemdisplayname,
		1 as thelevel
	FROM CommerceCategory
	JOIN CommerceCategoryItemAssociation AS CommCatAssoc ON CommCatAssoc.category = CommerceCategory.id
	JOIN Item ON CommCatAssoc.item = Item.id
	WHERE CommerceCategory.primaryparent IN (SELECT catid FROM ItemCatLevel0)
)

SELECT * FROM (
SELECT
	catid,
	catname,
	catparent,
	primaryparentname,
	itemid,
	itemname,
	itemdisplayname,
	thelevel
FROM ItemCatLevel0

UNION
SELECT
	catid,
	catname,
	catparent,
	primaryparentname,
	itemid,
	itemname,
	itemdisplayname,
	thelevel
FROM ItemCatLevel1
)