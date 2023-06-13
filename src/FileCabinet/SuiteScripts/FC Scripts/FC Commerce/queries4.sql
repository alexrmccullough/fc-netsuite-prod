WITH FullCatHier AS (
    SELECT CommerceCategory.id AS catid,
        CommerceCategory.name AS catname,
        CommerceCategory.primaryparent as catparent,
        CommCatAssoc.subcategory AS subcategory,
        CommCatAssoc2.subcategory AS subsubcategory,
        CommCatAssoc3.subcategory AS subsubsubcategory,
        (
            CommerceCategory.id || '-' || CommCatAssoc.subcategory || '-' || CommCatAssoc2.subcategory
        ) AS categoryhier
    FROM CommerceCategory
        LEFT OUTER JOIN CommerceCategoryAssociation AS CommCatAssoc ON CommCatAssoc.category = CommerceCategory.id
        LEFT OUTER JOIN CommerceCategoryAssociation AS CommCatAssoc2 ON CommCatAssoc2.category = CommCatAssoc.subcategory
        LEFT OUTER JOIN CommerceCategoryAssociation AS CommCatAssoc3 ON CommCatAssoc3.category = CommCatAssoc2.subcategory
    WHERE CommerceCategory.primaryparent IS NULL
),
CatHierSummary AS (
    SELECT cathierarchy,
        leaf
    FROM (
            SELECT ('' || FullCatHier.catid) AS cathierarchy,
                FulLCatHier.catid AS leaf
            FROM FullCatHier
            UNION
            SELECT (
                    FullCatHier.catid || '-' || FullCatHier.subcategory
                ) AS cathier,
                FulLCatHier.subcategory AS leaf
            FROM FullCatHier
            WHERE FullCatHier.subcategory IS NOT NULL
            UNION
            SELECT (
                    FullCatHier.catid || '-' || FullCatHier.subcategory || '-' || FullCatHier.subsubcategory
                ) AS cathierarchy,
                FulLCatHier.subsubcategory AS leaf
            FROM FullCatHier
            WHERE FullCatHier.subsubcategory IS NOT NULL
            UNION
            SELECT (
                    FullCatHier.catid || '-' || FullCatHier.subcategory || '-' || FullCatHier.subsubcategory || '-' || FullCatHier.subsubsubcategory
                ) AS cathierarchy,
                FulLCatHier.subsubsubcategory AS leaf
            FROM FullCatHier
            WHERE FullCatHier.subsubsubcategory IS NOT NULL
        )
),
ItemCatLevel0 AS (
    SELECT CommerceCategory.id AS catid,
        CommerceCategory.name AS catname,
        CommerceCategory.primaryparent as catparent,
        BUILTIN.DF(CommerceCategory.primaryparent) as primaryparentname,
        0 AS thelevel
    FROM CommerceCategory
        JOIN CommerceCategoryItemAssociation AS CommCatAssoc ON CommCatAssoc.category = CommerceCategory.id
    WHERE CommerceCategory.primaryparent IS NULL
),
ItemCatLevel1 AS (
    SELECT CommerceCategory.id AS catid,
        CommerceCategory.name AS catname,
        CommerceCategory.primaryparent as catparent,
        BUILTIN.DF(CommerceCategory.primaryparent) as primaryparentname,
        1 as thelevel
    FROM CommerceCategory
        JOIN CommerceCategoryItemAssociation AS CommCatAssoc ON CommCatAssoc.category = CommerceCategory.id
    WHERE CommerceCategory.primaryparent IN (
            SELECT catid
            FROM ItemCatLevel0
        )
),
ItemCatLevel2 AS (
    SELECT CommerceCategory.id AS catid,
        CommerceCategory.name AS catname,
        CommerceCategory.primaryparent as catparent,
        BUILTIN.DF(CommerceCategory.primaryparent) as primaryparentname,
        2 as thelevel
    FROM CommerceCategory
        JOIN CommerceCategoryItemAssociation AS CommCatAssoc ON CommCatAssoc.category = CommerceCategory.id
    WHERE CommerceCategory.primaryparent IN (
            SELECT catid
            FROM ItemCatLevel1
        )
),
ItemCatLevel3 AS (
    SELECT CommerceCategory.id AS catid,
        CommerceCategory.name AS catname,
        CommerceCategory.primaryparent as catparent,
        BUILTIN.DF(CommerceCategory.primaryparent) as primaryparentname,
        3 as thelevel
    FROM CommerceCategory
        JOIN CommerceCategoryItemAssociation AS CommCatAssoc ON CommCatAssoc.category = CommerceCategory.id
    WHERE CommerceCategory.primaryparent IN (
            SELECT catid
            FROM ItemCatLevel2
        )
),
CatSummary1 AS (
    SELECT *
    FROM (
            SELECT catid,
                catname,
                catparent,
                primaryparentname,
                thelevel
            FROM ItemCatLevel0
            UNION
            SELECT catid,
                catname,
                catparent,
                primaryparentname,
                thelevel
            FROM ItemCatLevel1
            UNION
            SELECT catid,
                catname,
                catparent,
                primaryparentname,
                thelevel
            FROM ItemCatLevel2
            UNION
            SELECT catid,
                catname,
                catparent,
                primaryparentname,
                thelevel
            FROM ItemCatLevel3
        )
),
CatSummary2 AS (
    SELECT catid,
        catname,
        catparent,
        primaryparentname,
        thelevel,
        cathierarchy
    FROM CatSummary1
        JOIN CatHierSummary ON CatSummary1.catid = CatHierSummary.leaf
)
SELECT LISTAGG(DISTINCT CommerceCategory.id, '-') WITHIN GROUP (
        ORDER BY CommerceCategory.id
    ) "categories",
    COUNT(CommerceCategory.id) AS category_count,
    Item.id AS iteminternalid,
    Item.itemid AS itemname,
    CASE
        WHEN COUNT(CommerceCategory.id) < 3 THEN 'F'
        ELSE NULL
    END AS fully_assigned,
    CASE
        WHEN COUNT(CommerceCategory.id) > 4 THEN 'T'
        ELSE NULL
    END AS over_assigned,
    MAX(CatSummary2.thelevel) AS maxlevel
FROM Item
    LEFT OUTER JOIN CommerceCategoryItemAssociation AS CatItemAssoc ON CatItemAssoc.item = item.id
    LEFT OUTER JOIN CommerceCategory ON CatItemAssoc.category = CommerceCategory.id
    LEFT OUTER JOIN CatSummary2 ON CatSummary2.catid = CommerceCategory.id
WHERE Item.isinactive = 'F'
    AND Item.department = '3'
    AND Item.isonline = 'T'
GROUP BY Item.id,
    Item.itemid
HAVING (MAX(CatSummary2.thelevel) IS NULL)
    OR (MAX(CatSummary2.thelevel) < 2)
ORDER BY COUNT(CommerceCategory.id)