type menu_entry = {
    name: string,
    description: string,
    imageUrl: string
}

type order = {
    id: string,
    name: string,
    contents: {
        name: string,
        quantity: number
    }[]
}