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
    SELECT cathier,
        leaf
    FROM (
            SELECT ('' || FullCatHier.catid) AS cathier,
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
                ) AS cathier,
                FulLCatHier.subsubcategory AS leaf
            FROM FullCatHier
            WHERE FullCatHier.subsubcategory IS NOT NULL
            UNION
            SELECT (
                    FullCatHier.catid || '-' || FullCatHier.subcategory || '-' || FullCatHier.subsubcategory || '-' || FullCatHier.subsubsubcategory
                ) AS cathier,
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
CatSummary AS (
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
)

SELECT 
    catid,
    catname,
    catparent,
    primaryparentname,
    thelevel,
    cathier
FROM CatSummary JOIN CatHierSummary ON CatSummary.catid = CatHierSummary.leaf