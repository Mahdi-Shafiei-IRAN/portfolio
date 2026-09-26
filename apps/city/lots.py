LOTS_PER_DISTRICT = 6


def assign_lots(items, per=LOTS_PER_DISTRICT):
    """Fill a district's building lots in order; empty lots are None, extras overflow.

    assign_lots(['a', 'b'], per=3) -> {'lots': ['a', 'b', None], 'overflow': []}
    """
    items = list(items)
    lots = items[:per] + [None] * max(0, per - len(items))
    return {'lots': lots, 'overflow': items[per:]}
