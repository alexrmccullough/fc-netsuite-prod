

define(
    [
    ],
    main
);

function main(
) {

    var exports = {
        Queries: {
            COMMERCE_CATEGORY_HIERARCHY: {
                SQL: `WITH FullCatHier AS (
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
                        SELECT 
                            cathierarchy,
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
                        cathierarchy
                    FROM CatSummary 
                    JOIN CatHierSummary ON CatSummary.catid = CatHierSummary.leaf
                `,
                Parameters: {
                },
                Columns: {
                    Leaf: 'catid',
                    CatHierStr: 'cathierarchy',
                    CatHierList: 'cathierarchylist',
                },
                Delimiters: {
                    CommerceCat: '-',
                },
                BuildQuery: function (params) {
                    return this.SQL;
                },
            },
            ITEM_ASSIGNED_CATEGORIES: {
                SQL: `WITH FullCatHier AS (
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
                        ) AS categories,
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
                        MAX(CatSummary2.thelevel) AS maxlevel,
                        SUM(
                            CASE
                                WHEN (CatSummary2.thelevel = 0) THEN 1
                                ELSE 0
                            END
                        ) countlevel0,
                            SUM(
                            CASE
                                WHEN (CatSummary2.thelevel = 1) THEN 1
                                ELSE 0
                            END
                        ) countlevel1,
                            SUM(
                            CASE
                                WHEN (CatSummary2.thelevel = 2) THEN 1
                                ELSE 0
                            END
                        ) countlevel2,
                            SUM(
                            CASE
                                WHEN (CatSummary2.thelevel = 3) THEN 1
                                ELSE 0
                            END
                        ) countlevel3,
                        CASE
                            WHEN (
                                (MAX(CatSummary2.thelevel) + 1) > COUNT(CommerceCategory.id)
                            ) THEN 'T'
                            ELSE NULL
                        END AS needsrecursiveassn
                    FROM Item
                        LEFT OUTER JOIN CommerceCategoryItemAssociation AS CatItemAssoc ON CatItemAssoc.item = item.id
                        LEFT OUTER JOIN CommerceCategory ON CatItemAssoc.category = CommerceCategory.id
                        LEFT OUTER JOIN CatSummary2 ON CatSummary2.catid = CommerceCategory.id
                    WHERE Item.isinactive = 'F'
                        AND Item.department = '3'
                        AND Item.isonline = 'T'
                    GROUP BY Item.id,
                        Item.itemid
                    ORDER BY COUNT(CommerceCategory.id)
                `,
                Parameters: {

                },
                Columns: {
                    ItemCategories: 'categories',
                    ItemInternalId: 'iteminternalid',
                    ItemName: 'itemname',
                    MaxCatLevel: 'maxlevel',
                },
                Delimiters: {
                    CommerceCat: '-',
                },
                BuildQuery: function (params) {
                    return this.SQL;
                },
            },
            ITEMS_OTHER_OBSERVATIONS: {
                SQL: `WITH FullCatHier AS (
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
                    ) AS categories,
                    COUNT(CommerceCategory.id) AS category_count,
                    Item.id AS iteminternalid,
                    Item.itemid AS itemname,
                    MAX(CatSummary2.thelevel) AS maxlevel,
                    SUM(
                        CASE
                            WHEN (CatSummary2.thelevel = 0) THEN 1
                            ELSE 0
                        END
                    ) countlevel0,
                        SUM(
                        CASE
                            WHEN (CatSummary2.thelevel = 1) THEN 1
                            ELSE 0
                        END
                    ) countlevel1,
                        SUM(
                        CASE
                            WHEN (CatSummary2.thelevel = 2) THEN 1
                            ELSE 0
                        END
                    ) countlevel2,
                        SUM(
                        CASE
                            WHEN (CatSummary2.thelevel = 3) THEN 1
                            ELSE 0
                        END
                    ) countlevel3,
                    CASE
                        WHEN (
                            (MAX(CatSummary2.thelevel) + 1) > COUNT(CommerceCategory.id)
                        ) THEN 'T'
                        ELSE NULL
                    END AS needsrecursiveassn,
                    CASE
                    WHEN COUNT(CommerceCategory.id) = 0 THEN 'Item not assigned to any categories'
                        ELSE NULL
                    END AS err_item_not_assigned,
                    CASE
                        WHEN COUNT(CommerceCategory.id) < 3 THEN 'Item assigned to too few categories'
                        ELSE NULL
                    END AS err_low_category_count,
                    CASE
                        WHEN MAX(CatSummary2.thelevel) < 2 THEN 'Item not assigned to Level 2 (or lower) category'
                        ELSE NULL
                    END AS err_item_not_level2,
                    CASE
                        WHEN COUNT(CommerceCategory.id) > 4 THEN 'Item over-assigned?'
                        ELSE NULL
                    END AS err_item_over_assigned
                FROM Item
                    LEFT OUTER JOIN CommerceCategoryItemAssociation AS CatItemAssoc ON CatItemAssoc.item = item.id
                    LEFT OUTER JOIN CommerceCategory ON CatItemAssoc.category = CommerceCategory.id
                    LEFT OUTER JOIN CatSummary2 ON CatSummary2.catid = CommerceCategory.id
                WHERE Item.isinactive = 'F'
                    AND Item.department = '3'
                    AND Item.isonline = 'T'
                GROUP BY Item.id,
                    Item.itemid
                HAVING
                    COUNT(CommerceCategory.id) = 0
                    OR COUNT(CommerceCategory.id) < 3
                    OR MAX(CatSummary2.thelevel) < 2
                    OR COUNT(CommerceCategory.id) > 4
                ORDER BY COUNT(CommerceCategory.id)
                `,
                Parameters: {
                },
                Columns: {
                    ItemCategories: 'categories',
                    ItemInternalId: 'iteminternalid',
                    ItemName: 'itemname',
                    MaxCatLevel: 'maxlevel',
                    ErrItemNotAssigned: 'err_item_not_assigned',
                    ErrLowCategoryCount: 'err_low_category_count',
                    ErrItemNotLevel2: 'err_item_not_level2',
                    ErrItemOverAssigned: 'err_item_over_assigned',
                },
                Delimiters: {
                    CommerceCat: '-',
                },
                BuildQuery: function (params) {
                    return this.SQL;
                },
            }
        }
    }

    var OutputFields = {
        ItemInternalId: 'iteminternalid',
        CategoryId: 'categoryid',
        IsPrimary: 'isprimary',
        ErrorMessage: 'errormessage',
    };
    exports.OutputFields = OutputFields;

    var EmailSettings = {
        SUMMARIZE_EMAIL: {
            EmailSubject: {
                Template: `Commerce Category Auto-Assign Update Summary - {{TIMESTAMP}}`,
            },
            EmailBody: {
                Template: `
                        <p>The Commerce Category Auto-assign script has completed.</p>. 
                        <br>
                        <h3>Succesfully updated items</h3>
                        {{SUCCESSFUL_CHANGES}}
                        <br>
                        <h3>Failed items</h3>
                        {{FAILED_CHANGES}}
                        <br>
                        <h3>Other Observations Noted</h3>
                        {{OTHER_OBSERVATIONS}}
                    `,
            },
            BuildSubject: function () {
                log.debug({ title: 'this in BuildSubject', details: this + ', ' + JSON.stringify(this) });

                let timestamp = FCLib.getStandardDateTimeString1();
                let subject = this.EmailSubject.Template;
                subject = subject.replace('{{TIMESTAMP}}', timestamp);
                return subject;
            },
            BuildBody: function (
                user = '',
                successfulChanges = '',
                failedChanges = '',
                otherObservations = '',
            ) {
                log.debug({ title: 'this in BuildBody', details: this + ', ' + JSON.stringify(this) });

                let body = this.EmailBody.Template;
                body = body.replace('{{USER}}', user);
                body = body.replace('{{SUCCESSFUL_CHANGES}}', successfulChanges);
                body = body.replace('{{FAILED_CHANGES}}', failedChanges);
                body = body.replace('{{OTHER_OBSERVATIONS}}', otherObservations);
                return body;
            },

            AuthorId: -5,
            RecipientsEmails: [
                'procurement@foodconnects.org',
                'alex@foodconnects.org',
            ],
            CcEmails: [],
            // RecipientsEmails: ['procurement@foodconnects.org'],
            // CcEmails: ['sales@foodconnects.org'],
            BccEmails: [],
            SUCCESS_TABLE: {
                Id: 'custpage_success_table',
                Label: 'Successful Commerce Category Assignments',
                Fields: {
                    ItemInternalId: {
                        Label: 'Item Internal Id',
                        GetTableElem: (thisRow) => { return thisRow[exports.OutputFields.ItemInternalId]; },
                    },
                    CommerceCategoryId: {
                        Label: 'Commerce Category Id',
                        GetTableElem: (thisRow) => { return thisRow[exports.OutputFields.CategoryId]; },
                    },
                    IsPrimary: {
                        Label: 'Is Primary',
                        GetTableElem: (thisRow) => { return thisRow[exports.OutputFields.IsPrimary]; },
                    },
                },
            },

            FAILURE_TABLE: {
                Id: 'custpage_failure_table',
                Label: 'Failed Commerce Category Assignments',
                Fields: {
                    ItemInternalId: {
                        Label: 'Item Internal Id',
                        GetTableElem: (thisRow) => { return thisRow[exports.OutputFields.ItemInternalId]; },
                    },
                    CommerceCategoryId: {
                        Label: 'Commerce Category Id',
                        GetTableElem: (thisRow) => { return thisRow[exports.OutputFields.CategoryId]; },
                    },
                    IsPrimary: {
                        Label: 'Is Primary',
                        GetTableElem: (thisRow) => { return thisRow[exports.OutputFields.IsPrimary]; },
                    },
                    Error: {
                        Label: 'Error',
                        GetTableElem: (thisRow) => { return thisRow[exports.OutputFields.ErrorMessage]; },
                    },
                },
            },

            OTHER_OBSERVATIONS_TABLE: {
                Id: 'custpage_other_observations_table',
                Label: 'Other Observations',
                Fields: {
                    ItemInternalId: {
                        Label: 'Item Internal Id',
                        GetTableElem: (thisRow) => { return thisRow[exports.Queries.ITEM_ASSIGNED_CATEGORIES.Columns.ItemInternalId]; },
                    },
                    ItemName: {
                        Label: 'Item Name',
                        GetTableElem: (thisRow) => { return thisRow[exports.Queries.ITEM_ASSIGNED_CATEGORIES.Columns.ItemName]; },
                    },
                    AssignedCategories: {
                        Label: 'Assigned Categories',
                        GetTableElem: (thisRow) => { return thisRow[exports.Queries.ITEM_ASSIGNED_CATEGORIES.Columns.ItemCategories]; },
                    },
                    MaxCatLevel: {
                        Label: 'Max Category Level',
                        GetTableElem: (thisRow) => { return thisRow[exports.Queries.ITEM_ASSIGNED_CATEGORIES.Columns.MaxCatLevel]; },
                    },
                    Observations: {
                        Label: 'Observations',
                        Id: 'observations',
                        GetTableElem: (thisRow) => { return thisRow.observations; },
                    },
                },
                Settings: {
                    // SOURCE_OBSERVATION_COL_PREFIX: 'err_',
                }
            }
        },

    };
    exports.EmailSettings = EmailSettings;

    return exports;

}