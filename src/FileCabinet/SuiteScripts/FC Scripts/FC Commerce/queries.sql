SELECT 
	LISTAGG(DISTINCT CommerceCategory.id, '-') WITHIN GROUP (ORDER BY CommerceCategory.id) "ID",
	COUNT(CommerceCategory.id) AS category_count,
	Item.id AS item,
	Item.itemid,
	CASE WHEN COUNT(CommerceCategory.id) < 3 THEN 'F' ELSE NULL END AS fully_assigned,
	CASE WHEN COUNT(CommerceCategory.id) > 4 THEN 'T' ELSE NULL END AS over_assigned
FROM Item
LEFT OUTER JOIN CommerceCategoryItemAssociation AS CatItemAssoc ON CatItemAssoc.item = item.id
LEFT OUTER JOIN CommerceCategory ON CatItemAssoc.category = CommerceCategory.id

WHERE 
	Item.isinactive = 'F' 
	AND Item.department = '3'
	AND Item.isonline = 'T'
GROUP BY
	Item.id,
	Item.itemid
ORDER BY 
	COUNT(CommerceCategory.id)

--------

SELECT
	Item.*
FROM 
	Item
WHERE
	Item.itemid = 'TBS030'

--------


WITH ItemCatLevel0 AS (
	SELECT 
		CommerceCategory.id AS catid,
		CommerceCategory.name AS catname,
		CommerceCategory.primaryparent as catparent,
		BUILTIN.DF(CommerceCategory.primaryparent) as primaryparentname,
		0 AS thelevel
	FROM CommerceCategory
	JOIN CommerceCategoryItemAssociation AS CommCatAssoc ON CommCatAssoc.category = CommerceCategory.id
	WHERE CommerceCategory.primaryparent IS NULL
), ItemCatLevel1 AS (
	SELECT 
		CommerceCategory.id AS catid,
		CommerceCategory.name AS catname,
		CommerceCategory.primaryparent as catparent,
		BUILTIN.DF(CommerceCategory.primaryparent) as primaryparentname,
		1 as thelevel
	FROM CommerceCategory
	JOIN CommerceCategoryItemAssociation AS CommCatAssoc ON CommCatAssoc.category = CommerceCategory.id
	WHERE CommerceCategory.primaryparent IN (SELECT catid FROM ItemCatLevel0)
), ItemCatLevel2 AS (
	SELECT 
		CommerceCategory.id AS catid,
		CommerceCategory.name AS catname,
		CommerceCategory.primaryparent as catparent,
		BUILTIN.DF(CommerceCategory.primaryparent) as primaryparentname,
		1 as thelevel
	FROM CommerceCategory
	JOIN CommerceCategoryItemAssociation AS CommCatAssoc ON CommCatAssoc.category = CommerceCategory.id
	WHERE CommerceCategory.primaryparent IN (SELECT catid FROM ItemCatLevel1)
), ItemCatLevel3 AS (
	SELECT 
		CommerceCategory.id AS catid,
		CommerceCategory.name AS catname,
		CommerceCategory.primaryparent as catparent,
		BUILTIN.DF(CommerceCategory.primaryparent) as primaryparentname,
		1 as thelevel
	FROM CommerceCategory
	JOIN CommerceCategoryItemAssociation AS CommCatAssoc ON CommCatAssoc.category = CommerceCategory.id
	WHERE CommerceCategory.primaryparent IN (SELECT catid FROM ItemCatLevel2)
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